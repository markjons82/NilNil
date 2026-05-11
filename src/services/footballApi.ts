import { Platform } from 'react-native';
import { Team } from '../data/teams';
import { Match } from '../data/matches';

// On web, requests go through the Metro dev server proxy (metro.config.js)
// to avoid CORS. On native, the direct URL is used.
const BASE_URL = Platform.OS === 'web'
  ? '/football-api'
  : 'https://api.football-data.org/v4';

const API_KEY = '364de95dbe5746d5a970a452bda6e828';

// ─── Rate limit state (module-level, persists across calls in a session) ──────

let requestsAvailable: number | null = null;
let resetAt: Date | null = null;

function parseRateHeaders(headers: Headers): void {
  const available = headers.get('X-Requests-Available');
  const reset = headers.get('X-RequestCounter-Reset');
  if (available !== null) requestsAvailable = Number(available);
  if (reset !== null) resetAt = parseResetDate(reset);
}

function parseResetDate(value: string): Date {
  // Try ISO string first, then Unix timestamp (seconds)
  const iso = new Date(value);
  if (!isNaN(iso.getTime())) return iso;
  const unix = Number(value);
  if (!isNaN(unix)) return new Date(unix * 1000);
  return new Date(Date.now() + 60_000);
}

async function throttleIfNeeded(): Promise<void> {
  if (requestsAvailable !== null && requestsAvailable <= 1 && resetAt) {
    const waitMs = resetAt.getTime() - Date.now();
    if (waitMs > 0) {
      await new Promise(resolve => setTimeout(resolve, waitMs + 200));
    }
  }
}

// ─── Team resolution ──────────────────────────────────────────────────────────

type ApiTeam = { id: number; name: string; shortName: string; tla: string; crest: string };

function resolveTeam(apiTeam: ApiTeam): Team {
  return {
    id: apiTeam.tla || String(apiTeam.id),
    name: apiTeam.name,
    shortName: apiTeam.shortName || apiTeam.name,
    badgeUrl: apiTeam.crest,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchAllScheduledMatches(): Promise<Match[]> {
  await throttleIfNeeded();

  const res = await fetch(`${BASE_URL}/competitions/PL/matches?status=SCHEDULED`, {
    headers: { 'X-Auth-Token': API_KEY },
  });

  parseRateHeaders(res.headers);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }

  const json = await res.json();

  const matches: Match[] = (json.matches ?? []).map((item: any) => ({
    id: String(item.id),
    homeTeam: resolveTeam(item.homeTeam),
    awayTeam: resolveTeam(item.awayTeam),
    kickoff: item.utcDate,
    competition: 'Premier League',
  }));

  return matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}

export async function fetchPremierLeagueTeams(): Promise<Team[]> {
  await throttleIfNeeded();

  const res = await fetch(`${BASE_URL}/competitions/PL/teams`, {
    headers: { 'X-Auth-Token': API_KEY },
  });

  parseRateHeaders(res.headers);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }

  const json = await res.json();

  const teams: Team[] = (json.teams ?? []).map((t: ApiTeam) => ({
    id: t.tla || String(t.id),
    name: t.name,
    shortName: t.shortName || t.name,
    badgeUrl: t.crest,
  }));

  return teams.sort((a, b) => a.name.localeCompare(b.name));
}
