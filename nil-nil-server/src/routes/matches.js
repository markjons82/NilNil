// src/routes/matches.js
// Endpoints for fetching match data.
// Your app can call these instead of Football-Data.org directly,
// which means you only need the API key in one place (the server).

const express = require('express');
const router = express.Router();
const matchMonitor = require('../matchMonitor');
const logger = require('../utils/logger');

/**
 * GET /api/matches/today
 * Returns today's Premier League matches.
 * Your app calls this to show "Next Match" on the alarm setup screen.
 */
router.get('/today', async (req, res) => {
  try {
    const matches = await matchMonitor.fetchTodayMatches();

    // Shape the response to only include what the frontend needs
    const simplified = matches.map((m) => ({
      id: m.id,
      homeTeam: {
        id: m.homeTeam.id,
        name: m.homeTeam.name,
        shortName: m.homeTeam.shortName,
        tla: m.homeTeam.tla,
        crest: m.homeTeam.crest,
      },
      awayTeam: {
        id: m.awayTeam.id,
        name: m.awayTeam.name,
        shortName: m.awayTeam.shortName,
        tla: m.awayTeam.tla,
        crest: m.awayTeam.crest,
      },
      utcDate: m.utcDate,
      status: m.status,
      score: m.score,
    }));

    res.json({ matches: simplified });
  } catch (error) {
    logger.error('Error fetching today matches:', error.message);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

/**
 * GET /api/matches/status
 * Returns the monitor's current status.
 * Useful for debugging - see what the server is tracking right now.
 */
router.get('/status', (req, res) => {
  res.json(matchMonitor.getStatus());
});

module.exports = router;
