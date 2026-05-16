// src/notificationService.js
// Sends push notifications to iOS devices via Apple Push Notification service (APNs).
// Uses JWT authentication with your .p8 key (no certificates needed).

const apn = require('@parse/node-apn');
const config = require('./config');
const logger = require('./utils/logger');

let provider = null;

function getProvider() {
  if (provider) return provider;

  if (!config.apn.privateKey || !config.apn.keyId || !config.apn.teamId) {
    logger.warn('APNs not configured - push notifications disabled');
    return null;
  }

  provider = new apn.Provider({
    token: {
      key: config.apn.privateKey,
      keyId: config.apn.keyId,
      teamId: config.apn.teamId,
    },
    // production: false = sandbox (TestFlight uses production APNs, not sandbox!)
    // TestFlight = production: true
    // Simulator = production: false
    production: config.isProduction,
  });

  logger.success(`APNs provider created (${config.isProduction ? 'PRODUCTION' : 'SANDBOX'})`);
  return provider;
}

/**
 * Sends a goal alert notification to a single device.
 * 
 * @param {string} deviceToken - The device's APNs token
 * @param {object} goalData - Info about the goal
 * @param {string} goalData.scorerName - Name of the goal scorer
 * @param {string} goalData.homeTeam - Home team name
 * @param {string} goalData.awayTeam - Away team name
 * @param {number} goalData.homeScore - Current home score
 * @param {number} goalData.awayScore - Current away score
 * @param {number} goalData.minute - Minute the goal was scored
 * @param {string} goalData.scoringTeam - Which team scored ('home' or 'away')
 */
async function sendGoalAlert(deviceToken, goalData, soundName = 'goal_alarm.wav') {
  const apnProvider = getProvider();
  if (!apnProvider) return { success: false, reason: 'APNs not configured' };

  const {
    scorerName,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    minute,
    scoringTeam,
  } = goalData;

  const scoringTeamName = scoringTeam === 'home' ? homeTeam : awayTeam;
  const scoreString = `${homeScore}-${awayScore}`;

  const notification = new apn.Notification();

  // The critical stuff - this is what wakes the user up
  notification.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires in 1 hour
  notification.badge = 1;
  notification.sound = soundName;
  notification.alert = {
    title: `⚽ GOAL! ${scoringTeamName}`,
    subtitle: `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`,
    body: scorerName
      ? `${scorerName} scores in the ${minute}'! Wake up! 🚨`
      : `Goal in the ${minute}'! Wake up! 🚨`,
  };

  // Custom data payload - your app reads this to show the GOAL! screen
  notification.payload = {
    type: 'GOAL_ALERT',
    scorerName: scorerName || 'Unknown',
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    minute,
    scoringTeam,
    timestamp: Date.now(),
  };

  notification.topic = config.apn.bundleId;

  // For Critical Alerts (bypasses silent mode) - needs Apple approval first
  // Uncomment these lines AFTER you get Critical Alerts entitlement approved:
  // notification.priority = 10;
  // notification.pushType = 'alert';
  // notification.payload['aps'] = {
  //   ...notification.payload['aps'],
  //   'critical': 1,
  //   'sound': { 'critical': 1, 'name': 'goal_alarm.wav', 'volume': 1.0 }
  // };

  try {
    const result = await apnProvider.send(notification, deviceToken);

    if (result.failed && result.failed.length > 0) {
      const failure = result.failed[0];
      logger.error(`APNs send failed for token ${deviceToken.slice(0, 8)}...:`, failure.response);
      return { success: false, reason: failure.response?.reason };
    }

    logger.success(`Goal alert sent to device ${deviceToken.slice(0, 8)}...`);
    return { success: true };

  } catch (error) {
    logger.error('APNs send error:', error.message);
    return { success: false, reason: error.message };
  }
}

/**
 * Sends a pre-match reminder notification.
 * Reminds user their team plays soon so they can enable the alarm.
 */
async function sendPreMatchReminder(deviceToken, matchData) {
  const apnProvider = getProvider();
  if (!apnProvider) return { success: false, reason: 'APNs not configured' };

  const { homeTeam, awayTeam, kickoffTime } = matchData;

  const notification = new apn.Notification();
  notification.expiry = Math.floor(Date.now() / 1000) + 3600;
  notification.sound = 'default';
  notification.alert = {
    title: `🏟️ Match Starting Soon`,
    body: `${homeTeam} vs ${awayTeam} kicks off at ${kickoffTime}. Make sure your alarm is on!`,
  };
  notification.payload = {
    type: 'PRE_MATCH',
    homeTeam,
    awayTeam,
    kickoffTime,
  };
  notification.topic = config.apn.bundleId;

  try {
    const result = await apnProvider.send(notification, deviceToken);
    return result.failed?.length === 0
      ? { success: true }
      : { success: false, reason: result.failed[0]?.response?.reason };
  } catch (error) {
    return { success: false, reason: error.message };
  }
}

/**
 * Sends a test notification - useful for the "Test Alarm" button in the app.
 */
async function sendTestNotification(deviceToken) {
  const apnProvider = getProvider();
  if (!apnProvider) return { success: false, reason: 'APNs not configured' };

  const notification = new apn.Notification();
  notification.expiry = Math.floor(Date.now() / 1000) + 300;
  notification.sound = 'goal_alarm.wav';
  notification.alert = {
    title: '⚽ TEST - GOAL!',
    subtitle: 'Liverpool 1 - 0 Arsenal',
    body: 'Mo Salah scores in the 52nd minute! 🚨 (This is a test)',
  };
  notification.payload = {
    type: 'TEST_GOAL_ALERT',
    scorerName: 'Mo Salah',
    homeTeam: 'Liverpool',
    awayTeam: 'Arsenal',
    homeScore: 1,
    awayScore: 0,
    minute: 52,
    scoringTeam: 'home',
    timestamp: Date.now(),
  };
  notification.topic = config.apn.bundleId;

  try {
    const result = await apnProvider.send(notification, deviceToken);
    if (result.failed?.length > 0) {
      return { success: false, reason: result.failed[0]?.response?.reason };
    }
    logger.success(`Test notification sent to ${deviceToken.slice(0, 8)}...`);
    return { success: true };
  } catch (error) {
    return { success: false, reason: error.message };
  }
}

function closeProvider() {
  if (provider) {
    provider.shutdown();
    provider = null;
  }
}

module.exports = {
  sendGoalAlert,
  sendPreMatchReminder,
  sendTestNotification,
  closeProvider,
};
