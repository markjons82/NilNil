// src/goalDetector.js
// Compares the previous match state to the current state.
// If the score changed, a goal happened - figure out who scored and notify.

const db = require('./database');
const notificationService = require('./notificationService');
const logger = require('./utils/logger');

/**
 * Checks a match for new goals by comparing old score to new score.
 * Handles multiple goals at once (e.g. if polling was paused and two goals happened).
 * 
 * @param {object} previousState - { homeScore, awayScore } from last check
 * @param {object} currentMatch - Full match object from Football-Data.org API
 * @returns {boolean} true if a goal was detected
 */
async function checkForGoals(previousState, currentMatch) {
  const {
    id: matchId,
    homeTeam,
    awayTeam,
    score,
  } = currentMatch;

  const currentHomeScore = score.fullTime.home ?? 0;
  const currentAwayScore = score.fullTime.away ?? 0;
  const prevHomeScore = previousState.homeScore ?? 0;
  const prevAwayScore = previousState.awayScore ?? 0;

  // No change - no goals
  if (currentHomeScore === prevHomeScore && currentAwayScore === prevAwayScore) {
    return false;
  }

  const goalsDetected = [];

  // Home team scored
  if (currentHomeScore > prevHomeScore) {
    const numGoals = currentHomeScore - prevHomeScore;
    for (let i = 0; i < numGoals; i++) {
      const goalHomeScore = prevHomeScore + i + 1;
      const goalAwayScore = currentAwayScore; // away score is whatever it is now
      goalsDetected.push({
        scoringTeam: 'home',
        homeScore: goalHomeScore,
        awayScore: prevAwayScore, // Use prev away at time of this home goal
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
      });
    }
  }

  // Away team scored  
  if (currentAwayScore > prevAwayScore) {
    const numGoals = currentAwayScore - prevAwayScore;
    for (let i = 0; i < numGoals; i++) {
      const goalAwayScore = prevAwayScore + i + 1;
      goalsDetected.push({
        scoringTeam: 'away',
        homeScore: prevHomeScore, // Use prev home at time of this away goal
        awayScore: goalAwayScore,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
      });
    }
  }

  // Process each detected goal
  for (const goal of goalsDetected) {
    const isFirstGoal = goal.homeScore + goal.awayScore === 1;

    logger.goal(
      `GOAL! ${homeTeam.name} ${goal.homeScore} - ${goal.awayScore} ${awayTeam.name}` +
      ` (${goal.scoringTeam} team scored)`
    );

    // Check if we already sent a notification for this exact score (prevents duplicates on restart)
    if (db.hasNotificationBeenSent(matchId, goal.homeScore, goal.awayScore)) {
      logger.info(`Already notified for match ${matchId} score ${goal.homeScore}-${goal.awayScore}, skipping`);
      continue;
    }

    // Get devices that should be notified
    const devicesToNotify = getDevicesToNotify(
      goal,
      homeTeam.id,
      awayTeam.id,
      isFirstGoal
    );

    if (devicesToNotify.length === 0) {
      logger.info(`No active alarms for this match goal`);
    } else {
      logger.info(`Notifying ${devicesToNotify.length} device(s)`);
      await notifyDevices(devicesToNotify, goal, currentMatch, isFirstGoal);
    }

    // Mark this score as notified to prevent duplicates
    db.markNotificationSent(matchId, goal.homeScore, goal.awayScore);
  }

  return goalsDetected.length > 0;
}

/**
 * Figures out which devices should get notified for this goal,
 * based on each user's alarm_type preference.
 */
function getDevicesToNotify(goal, homeTeamId, awayTeamId, isFirstGoal) {
  const allDevices = db.getDevicesForMatch(homeTeamId, awayTeamId);

  return allDevices.filter((device) => {
    switch (device.alarm_type) {
      case 'my_team':
        // Only notify if the user's team scored
        const userTeamId = device.team_id;
        if (goal.scoringTeam === 'home') return userTeamId === homeTeamId;
        if (goal.scoringTeam === 'away') return userTeamId === awayTeamId;
        return false;

      case 'any_goal':
        // Notify on any goal in matches involving their team
        return true;

      case 'first_goal':
        // Only notify on the very first goal of the match
        return isFirstGoal;

      default:
        return false;
    }
  });
}

/**
 * Sends goal alert notifications to a list of devices.
 */
async function notifyDevices(devices, goal, currentMatch, isFirstGoal) {
  const { homeTeam, awayTeam } = currentMatch;
  
  // Try to get the scorer name from the API events
  // Football-Data.org includes goals in match.goals array
  const goals = currentMatch.goals || [];
  const latestGoal = goals.find(g => {
    if (goal.scoringTeam === 'home') return g.team?.id === homeTeam.id;
    if (goal.scoringTeam === 'away') return g.team?.id === awayTeam.id;
    return false;
  });
  
  // Get the most recent goal scorer
  const scorerName = latestGoal?.scorer?.name || null;
  const minute = latestGoal?.minute || '?';

  const goalData = {
    scorerName,
    homeTeam: homeTeam.shortName || homeTeam.name,
    awayTeam: awayTeam.shortName || awayTeam.name,
    homeScore: goal.homeScore,
    awayScore: goal.awayScore,
    minute,
    scoringTeam: goal.scoringTeam,
  };

  // Send notifications in parallel for speed
  const results = await Promise.allSettled(
    devices.map((device) =>
      notificationService.sendGoalAlert(device.device_token, goalData)
    )
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - succeeded;

  logger.success(`Notifications sent: ${succeeded} succeeded, ${failed} failed`);
}

module.exports = { checkForGoals };
