// src/matchMonitor.js
// This is the core of the server.
// It watches for live Premier League matches and calls goalDetector when scores change.
//
// How it works:
// 1. Every 5 minutes: Fetches today's PL match schedule
// 2. When matches are live: Polls every 30 seconds for score updates
// 3. Compares new scores to old scores - if changed, a goal happened
// 4. Calls goalDetector to figure out who to notify

const axios = require('axios');
const config = require('./config');
const goalDetector = require('./goalDetector');
const logger = require('./utils/logger');
const db = require('./database');

// In-memory state - tracks current scores to detect changes
// Map<matchId, { homeScore, awayScore, status }>
const matchStates = new Map();

// Track if we're currently in a live polling cycle
let livePollingInterval = null;
let scheduleCheckInterval = null;

// Today's scheduled matches (refreshed every 5 mins)
let todayMatches = [];

// --- Football-Data.org API client ---

const apiClient = axios.create({
  baseURL: config.footballData.baseUrl,
  headers: {
    'X-Auth-Token': config.footballData.apiKey,
  },
  timeout: 10000,
});

/**
 * Fetches today's Premier League matches from Football-Data.org.
 * Returns an array of match objects.
 */
async function fetchTodayMatches() {
  if (!config.footballData.apiKey) {
    logger.warn('Football-Data API key not set - match monitoring disabled');
    return [];
  }

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const response = await apiClient.get(
      `/competitions/${config.footballData.plCompetitionId}/matches`,
      {
        params: {
          dateFrom: today,
          dateTo: today,
        },
      }
    );

    const matches = response.data.matches || [];
    logger.match(`Today's PL matches: ${matches.length} scheduled`);

    matches.forEach((m) => {
      logger.match(
        `  ${m.homeTeam.shortName} vs ${m.awayTeam.shortName} ` +
        `- Status: ${m.status} ` +
        `- Time: ${new Date(m.utcDate).toLocaleTimeString()}`
      );
    });

    return matches;
  } catch (error) {
    if (error.response?.status === 429) {
      logger.warn('Football-Data API rate limit hit - will retry in 5 minutes');
    } else if (error.response?.status === 403) {
      logger.error('Football-Data API key invalid or expired');
    } else {
      logger.error('Error fetching today matches:', error.message);
    }
    return [];
  }
}

/**
 * Fetches a single live match with full detail (including goals array).
 * This is what we call every 30 seconds during live games.
 */
async function fetchLiveMatchDetail(matchId) {
  try {
    const response = await apiClient.get(`/matches/${matchId}`);
    return response.data;
  } catch (error) {
    logger.error(`Error fetching match ${matchId}:`, error.message);
    return null;
  }
}

/**
 * Fetches all currently live PL matches.
 * More efficient than fetching each match individually.
 */
async function fetchLiveMatches() {
  try {
    const response = await apiClient.get(
      `/competitions/${config.footballData.plCompetitionId}/matches`,
      { params: { status: 'LIVE,IN_PLAY,PAUSED' } }
    );
    return response.data.matches || [];
  } catch (error) {
    logger.error('Error fetching live matches:', error.message);
    return [];
  }
}

// --- Match state management ---

/**
 * Returns true if there are any matches happening right now
 * (or starting within 10 minutes, to give us time to start polling).
 */
function hasActiveOrUpcomingMatches(matches) {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;

  return matches.some((match) => {
    const kickoff = new Date(match.utcDate).getTime();
    const status = match.status;

    // Currently live
    if (['IN_PLAY', 'PAUSED', 'LIVE'].includes(status)) return true;

    // Starting within 10 minutes
    if (status === 'TIMED' && kickoff - now < tenMinutes) return true;

    return false;
  });
}

/**
 * Gets the current home/away scores from a match object.
 * Handles Football-Data.org's nested score format.
 */
function extractScores(match) {
  return {
    homeScore: match.score?.fullTime?.home ?? 0,
    awayScore: match.score?.fullTime?.away ?? 0,
    status: match.status,
  };
}

// --- The main polling loop ---

/**
 * Called every 30 seconds when matches are live.
 * Fetches current scores and checks for goals.
 */
async function pollLiveMatches() {
  const liveMatches = await fetchLiveMatches();

  if (liveMatches.length === 0) {
    logger.info('No live matches found in this poll cycle');
    return;
  }

  logger.match(`Polling ${liveMatches.length} live match(es)...`);

  for (const match of liveMatches) {
    const matchId = match.id;
    const currentScores = extractScores(match);
    const previousState = matchStates.get(matchId);

    if (!previousState) {
      // First time we've seen this match - initialize state, don't alert yet
      logger.match(
        `Tracking new live match: ${match.homeTeam.shortName} ` +
        `${currentScores.homeScore}-${currentScores.awayScore} ` +
        `${match.awayTeam.shortName}`
      );
      matchStates.set(matchId, currentScores);
      continue;
    }

    // Compare scores - check for goals
    const scoreChanged =
      currentScores.homeScore !== previousState.homeScore ||
      currentScores.awayScore !== previousState.awayScore;

    if (scoreChanged) {
      // Fetch full match detail to get scorer names
      const fullMatchDetail = await fetchLiveMatchDetail(matchId);
      if (fullMatchDetail) {
        await goalDetector.checkForGoals(previousState, fullMatchDetail);
      } else {
        // Fallback: use match data without scorer name
        await goalDetector.checkForGoals(previousState, match);
      }
    }

    // Update state
    matchStates.set(matchId, currentScores);

    // Clean up finished matches
    if (['FINISHED', 'AWARDED', 'POSTPONED', 'CANCELLED'].includes(currentScores.status)) {
      logger.match(`Match ${matchId} finished - removing from tracking`);
      matchStates.delete(matchId);
    }
  }
}

/**
 * Refreshes today's match schedule and adjusts polling accordingly.
 * Called every 5 minutes.
 */
async function refreshSchedule() {
  logger.info('Refreshing match schedule...');
  todayMatches = await fetchTodayMatches();

  const shouldPoll = hasActiveOrUpcomingMatches(todayMatches);

  if (shouldPoll && !livePollingInterval) {
    // Start live polling
    logger.success(
      `Live matches detected! Starting 30-second polling...`
    );
    livePollingInterval = setInterval(
      pollLiveMatches,
      config.polling.liveMatchInterval
    );
    // Poll immediately too
    pollLiveMatches();
  } else if (!shouldPoll && livePollingInterval) {
    // Stop live polling - no active matches
    logger.info('No active matches - pausing live polling to save API calls');
    clearInterval(livePollingInterval);
    livePollingInterval = null;
    matchStates.clear();
  } else if (shouldPoll) {
    logger.match(`Live polling already running (${matchStates.size} matches tracked)`);
  } else {
    logger.info('No matches today/currently - standing by');
  }
}

// --- Public API ---

/**
 * Starts the match monitor.
 * Call this once when the server starts.
 */
function start() {
  logger.info('Match monitor starting...');

  // Do an immediate schedule check
  refreshSchedule();

  // Then check every 5 minutes
  scheduleCheckInterval = setInterval(
    refreshSchedule,
    config.polling.scheduleCheckInterval
  );

  // Clean old notifications daily
  const cleanupInterval = setInterval(() => {
    db.cleanOldNotifications();
    logger.info('Cleaned old notification records');
  }, 24 * 60 * 60 * 1000);

  logger.success('Match monitor running ✓');
}

function stop() {
  if (livePollingInterval) clearInterval(livePollingInterval);
  if (scheduleCheckInterval) clearInterval(scheduleCheckInterval);
  logger.info('Match monitor stopped');
}

function getStatus() {
  return {
    todayMatchCount: todayMatches.length,
    liveMatchesTracked: matchStates.size,
    isLivePolling: !!livePollingInterval,
    trackedMatches: Array.from(matchStates.entries()).map(([id, state]) => ({
      matchId: id,
      ...state,
    })),
  };
}

module.exports = { start, stop, getStatus, fetchTodayMatches };
