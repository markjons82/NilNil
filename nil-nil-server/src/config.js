// src/config.js
// Loads all environment variables and validates they exist.
// If something is missing, the server tells you exactly what to add.

require('dotenv').config();

const required = [
  'FOOTBALL_DATA_API_KEY',
  'APN_KEY_ID',
  'APN_TEAM_ID',
  'APN_BUNDLE_ID',
  'APN_PRIVATE_KEY',
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.warn(
    `⚠️  Missing environment variables: ${missing.join(', ')}\n` +
    `   Push notifications will be disabled until these are set.\n` +
    `   Copy .env.example to .env and fill in your values.`
  );
}

module.exports = {
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  footballData: {
    apiKey: process.env.FOOTBALL_DATA_API_KEY,
    baseUrl: 'https://api.football-data.org/v4',
    // Premier League competition ID
    plCompetitionId: 'PL',
  },

  apn: {
    keyId: process.env.APN_KEY_ID,
    teamId: process.env.APN_TEAM_ID,
    bundleId: process.env.APN_BUNDLE_ID,
    privateKey: (() => {
      const key = process.env.APN_PRIVATE_KEY;
      if (!key) return null;
      return key.includes('\n') ? key : key.replace(/\\n/g, '\n');
    })(),
  },

  polling: {
    // How often to check for live matches (milliseconds)
    liveMatchInterval: 30 * 1000,      // 30 seconds during live games
    scheduleCheckInterval: 5 * 60 * 1000, // 5 minutes to check today's schedule
  },
};
