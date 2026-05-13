// src/database.js
// Sets up a SQLite database to store device tokens and alarm preferences.
// SQLite is a single file - perfect for free tier hosting, no extra DB needed.

const Database = require('better-sqlite3');
const path = require('path');
const logger = require('./utils/logger');

const DB_PATH = path.join(__dirname, '..', 'nil-nil.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL'); // Better performance
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  const database = db;

  // devices table - one row per user device
  database.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      device_token     TEXT    NOT NULL UNIQUE,
      team_id          INTEGER NOT NULL,
      team_name        TEXT    NOT NULL,
      alarm_type       TEXT    NOT NULL DEFAULT 'my_team',
      alarm_enabled    INTEGER NOT NULL DEFAULT 1,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // goal_notifications table - track what we've already sent so we don't double-notify
  database.exec(`
    CREATE TABLE IF NOT EXISTS sent_notifications (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id     INTEGER NOT NULL,
      home_score   INTEGER NOT NULL,
      away_score   INTEGER NOT NULL,
      sent_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(match_id, home_score, away_score)
    );
  `);

  logger.success('Database initialized');
}

// --- Device operations ---

function registerDevice({ deviceToken, teamId, teamName, alarmType = 'my_team' }) {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO devices (device_token, team_id, team_name, alarm_type, alarm_enabled)
    VALUES (@deviceToken, @teamId, @teamName, @alarmType, 1)
    ON CONFLICT(device_token) DO UPDATE SET
      team_id       = excluded.team_id,
      team_name     = excluded.team_name,
      alarm_type    = excluded.alarm_type,
      alarm_enabled = 1,
      updated_at    = datetime('now')
  `);
  return stmt.run({ deviceToken, teamId, teamName, alarmType });
}

function updatePreferences({ deviceToken, teamId, teamName, alarmType, alarmEnabled }) {
  const database = getDb();
  const updates = [];
  const params = { deviceToken };

  if (teamId !== undefined) { updates.push('team_id = @teamId'); params.teamId = teamId; }
  if (teamName !== undefined) { updates.push('team_name = @teamName'); params.teamName = teamName; }
  if (alarmType !== undefined) { updates.push('alarm_type = @alarmType'); params.alarmType = alarmType; }
  if (alarmEnabled !== undefined) { updates.push('alarm_enabled = @alarmEnabled'); params.alarmEnabled = alarmEnabled ? 1 : 0; }

  if (updates.length === 0) return null;

  updates.push("updated_at = datetime('now')");
  const stmt = database.prepare(
    `UPDATE devices SET ${updates.join(', ')} WHERE device_token = @deviceToken`
  );
  return stmt.run(params);
}

function getDevicesForMatch(homeTeamId, awayTeamId) {
  const database = getDb();
  // Returns all devices that should be alerted for this match
  return database.prepare(`
    SELECT * FROM devices
    WHERE alarm_enabled = 1
      AND (
        alarm_type = 'any_goal'
        OR (alarm_type = 'my_team' AND (team_id = ? OR team_id = ?))
        OR alarm_type = 'first_goal'
      )
  `).all(homeTeamId, awayTeamId);
}

function getDevicesForTeam(teamId) {
  const database = getDb();
  return database.prepare(`
    SELECT * FROM devices
    WHERE alarm_enabled = 1
      AND team_id = ?
  `).all(teamId);
}

function getAllEnabledDevices() {
  const database = getDb();
  return database.prepare(`SELECT * FROM devices WHERE alarm_enabled = 1`).all();
}

function getDeviceCount() {
  const database = getDb();
  return database.prepare(`SELECT COUNT(*) as count FROM devices`).get();
}

// --- Notification deduplication ---

function hasNotificationBeenSent(matchId, homeScore, awayScore) {
  const database = getDb();
  const row = database.prepare(`
    SELECT id FROM sent_notifications
    WHERE match_id = ? AND home_score = ? AND away_score = ?
  `).get(matchId, homeScore, awayScore);
  return !!row;
}

function markNotificationSent(matchId, homeScore, awayScore) {
  const database = getDb();
  try {
    database.prepare(`
      INSERT OR IGNORE INTO sent_notifications (match_id, home_score, away_score)
      VALUES (?, ?, ?)
    `).run(matchId, homeScore, awayScore);
  } catch (e) {
    // Duplicate - already sent, that's fine
  }
}

// Clean up old sent notifications (older than 2 days)
function cleanOldNotifications() {
  const database = getDb();
  database.prepare(`
    DELETE FROM sent_notifications
    WHERE sent_at < datetime('now', '-2 days')
  `).run();
}

module.exports = {
  getDb,
  registerDevice,
  updatePreferences,
  getDevicesForMatch,
  getDevicesForTeam,
  getAllEnabledDevices,
  getDeviceCount,
  hasNotificationBeenSent,
  markNotificationSent,
  cleanOldNotifications,
};
