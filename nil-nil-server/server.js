// server.js
// Entry point for the Nil Nil backend server.
// Run with: node server.js (or npm start)

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./src/config');
const matchMonitor = require('./src/matchMonitor');
const { getDeviceCount } = require('./src/database');
const logger = require('./src/utils/logger');

const alarmRoutes = require('./src/routes/alarms');
const matchRoutes = require('./src/routes/matches');

const app = express();

// --- Middleware ---
app.use(helmet()); // Security headers
app.use(cors());   // Allow requests from your React Native app
app.use(express.json());

// --- Routes ---
app.use('/api/alarms', alarmRoutes);
app.use('/api/matches', matchRoutes);

/**
 * GET /health
 * Used by Railway/Render to check the server is alive.
 * Also shows you a quick summary of what's running.
 */
app.get('/health', (req, res) => {
  const monitorStatus = matchMonitor.getStatus();
  const deviceStats = getDeviceCount();

  res.json({
    status: 'ok',
    app: 'Nil Nil Server',
    version: '1.0.0',
    environment: config.nodeEnv,
    uptime: Math.floor(process.uptime()) + 's',
    registeredDevices: deviceStats.count,
    matchMonitor: monitorStatus,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/debug/apns', (req, res) => {
  const privateKey = process.env.APN_PRIVATE_KEY;
  res.json({
    APN_KEY_ID: process.env.APN_KEY_ID || null,
    APN_TEAM_ID: process.env.APN_TEAM_ID || null,
    APN_BUNDLE_ID: process.env.APN_BUNDLE_ID || null,
    APN_PRIVATE_KEY_exists: !!privateKey,
    APN_PRIVATE_KEY_preview: privateKey ? privateKey.slice(0, 20) : null,
  });
});

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// --- Error handler ---
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// --- Start ---
const server = app.listen(config.port, '0.0.0.0', () => {
  logger.success(`Nil Nil server running on port ${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Health check: http://localhost:${config.port}/health`);

  // Start watching for live matches
  matchMonitor.start();
});

// --- Graceful shutdown ---
process.on('SIGTERM', () => {
  logger.info('SIGTERM received - shutting down gracefully');
  matchMonitor.stop();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received - shutting down');
  matchMonitor.stop();
  server.close(() => process.exit(0));
});

module.exports = app;
