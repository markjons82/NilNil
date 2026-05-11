import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Team } from '../data/teams';
import { fetchPremierLeagueTeams } from '../services/footballApi';

const CACHE_KEY = '@nilnil_pl_teams';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface TeamsCache {
  teams: Team[];
  fetchedAt: number;
}

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      const cached: TeamsCache | null = raw ? JSON.parse(raw) : null;

      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        if (!cancelled) { setTeams(cached.teams); setLoading(false); }
        return;
      }

      try {
        const fresh = await fetchPremierLeagueTeams();
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ teams: fresh, fetchedAt: Date.now() }));
        if (!cancelled) { setTeams(fresh); setLoading(false); }
      } catch (e: any) {
        if (cached) {
          // Serve stale data rather than a blank screen
          if (!cancelled) { setTeams(cached.teams); setLoading(false); }
        } else {
          if (!cancelled) { setError(e?.message ?? 'Failed to load teams'); setLoading(false); }
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { teams, loading, error };
}
