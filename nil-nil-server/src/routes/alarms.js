// src/routes/alarms.js
// API endpoints that your React Native app calls.
// Register a device, update preferences, disable alarms, test notifications.

const express = require('express');
const router = express.Router();
const db = require('../database');
const notificationService = require('../notificationService');
const logger = require('../utils/logger');

// Valid alarm types - matches what the frontend sends
const VALID_ALARM_TYPES = ['my_team', 'any_goal', 'first_goal'];

/**
 * POST /api/alarms/register
 * Called when user sets up their alarm for the first time, or updates their team.
 * 
 * Body: {
 *   deviceToken: string,   // APNs device token from iOS
 *   teamId: number,        // Football-Data.org team ID
 *   teamName: string,      // Human readable team name
 *   alarmType: string      // 'my_team' | 'any_goal' | 'first_goal'
 * }
 */
router.post('/register', (req, res) => {
  const { deviceToken, teamId, teamName, alarmType = 'my_team', soundName = 'goal_alarm.wav' } = req.body;

  if (!deviceToken) {
    return res.status(400).json({ error: 'deviceToken is required' });
  }
  if (!teamId || !teamName) {
    return res.status(400).json({ error: 'teamId and teamName are required' });
  }
  if (!VALID_ALARM_TYPES.includes(alarmType)) {
    return res.status(400).json({
      error: `alarmType must be one of: ${VALID_ALARM_TYPES.join(', ')}`,
    });
  }

  try {
    db.registerDevice({ deviceToken, teamId, teamName, alarmType, soundName });
    logger.success(`Device registered: ${teamName} alarm (${alarmType}, sound: ${soundName})`);

    res.json({
      success: true,
      message: `Alarm registered for ${teamName}`,
      alarmType,
    });
  } catch (error) {
    logger.error('Register error:', error.message);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

/**
 * PUT /api/alarms/preferences
 * Update alarm preferences without re-registering.
 * Useful when user changes settings in the app.
 * 
 * Body: {
 *   deviceToken: string,
 *   teamId?: number,
 *   teamName?: string,
 *   alarmType?: string,
 *   alarmEnabled?: boolean
 * }
 */
router.put('/preferences', (req, res) => {
  const { deviceToken, teamId, teamName, alarmType, alarmEnabled } = req.body;

  if (!deviceToken) {
    return res.status(400).json({ error: 'deviceToken is required' });
  }
  if (alarmType && !VALID_ALARM_TYPES.includes(alarmType)) {
    return res.status(400).json({
      error: `alarmType must be one of: ${VALID_ALARM_TYPES.join(', ')}`,
    });
  }

  try {
    const result = db.updatePreferences({
      deviceToken,
      teamId,
      teamName,
      alarmType,
      alarmEnabled,
    });

    if (!result || result.changes === 0) {
      return res.status(404).json({
        error: 'Device not found. Call /register first.',
      });
    }

    res.json({ success: true, message: 'Preferences updated' });
  } catch (error) {
    logger.error('Update preferences error:', error.message);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * POST /api/alarms/disable
 * Disables alarm for a device (when user turns off alarm in app).
 * Keeps their registration so they can re-enable without re-registering.
 * 
 * Body: { deviceToken: string }
 */
router.post('/disable', (req, res) => {
  const { deviceToken } = req.body;
  if (!deviceToken) {
    return res.status(400).json({ error: 'deviceToken is required' });
  }

  try {
    db.updatePreferences({ deviceToken, alarmEnabled: false });
    res.json({ success: true, message: 'Alarm disabled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disable alarm' });
  }
});

/**
 * POST /api/alarms/enable
 * Re-enables alarm for a device.
 * 
 * Body: { deviceToken: string }
 */
router.post('/enable', (req, res) => {
  const { deviceToken } = req.body;
  if (!deviceToken) {
    return res.status(400).json({ error: 'deviceToken is required' });
  }

  try {
    db.updatePreferences({ deviceToken, alarmEnabled: true });
    res.json({ success: true, message: 'Alarm enabled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to enable alarm' });
  }
});

/**
 * POST /api/alarms/test
 * Sends a test goal alert to a device.
 * Called when user taps "Test Alarm" button in the app.
 * 
 * Body: { deviceToken: string }
 */
router.post('/test', async (req, res) => {
  const { deviceToken } = req.body;
  if (!deviceToken) {
    return res.status(400).json({ error: 'deviceToken is required' });
  }

  try {
    const result = await notificationService.sendTestNotification(deviceToken);

    if (result.success) {
      res.json({ success: true, message: 'Test notification sent!' });
    } else {
      res.status(500).json({
        error: 'Failed to send test notification',
        reason: result.reason,
      });
    }
  } catch (error) {
    logger.error('Test notification error:', error.message);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

module.exports = router;
