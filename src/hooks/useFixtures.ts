import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Team } from '../data/teams';
import { Match, MatchSection, formatSectionTitle } from '../data/matches';
import { fetchAllScheduledMatches } from '../services/footballApi';

const CACHE_KEY = '@nilnil_fixtures_all';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface AllFixturesCache {
  fetchedAt: string;
  matches: Match[];
}

function filterForTeam(matches: Match[], teamId: string): Match[] {
  return matches.filter(m => m.homeTeam.id === teamId || m.awayTeam.id === teamId);
}

function groupIntoSections(matches: Match[]): MatchSection[] {
  const grouped = new Map<string, Match[]>();
  for (const match of matches) {
    const key = match.kickoff.slice(0, 10);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(match);
  }
  return Array.from(grouped.entries()).map(([, data]) => ({
    title: formatSectionTitle(data[0].kickoff),
    data,
  }));
}

export function useFixtures(team: Team) {
  const [sections, setSections] = useState<MatchSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Serve cached data immediately
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      let cacheIsFresh = false;

      if (raw) {
        const { fetchedAt, matches } = JSON.parse(raw) as AllFixturesCache;
        if (!cancelled) {
          setSections(groupIntoSections(filterForTeam(matches, team.id)));
          setLoading(false);
        }
        cacheIsFresh = Date.now() - new Date(fetchedAt).getTime() < CACHE_TTL_MS;
      }

      if (cacheIsFresh) return;

      // Fetch fresh data from API
      try {
        const allMatches = await fetchAllScheduledMatches();

        // Only persist non-empty results so a bad response doesn't lock out future fetches
        if (allMatches.length > 0) {
          const cache: AllFixturesCache = { fetchedAt: new Date().toISOString(), matches: allMatches };
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        }

        if (!cancelled) {
          setSections(groupIntoSections(filterForTeam(allMatches, team.id)));
          setLoading(false);
          setError(null);
        }
      } catch (e) {
        console.error('[useFixtures] fetch failed:', e);
        if (!cancelled) {
          if (!raw) setError('Could not load fixtures. Check your connection.');
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [team.id]);

  return { sections, loading, error };
}
