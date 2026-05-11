import AsyncStorage from '@react-native-async-storage/async-storage';
import { Team } from './teams';
import { Match } from './matches';

export interface SavedAlarm {
  id: string;
  matchId: string;
  team: Team;
  match: Match;
  myTeamScores: boolean;
  anyGoal: boolean;
  firstGoal: boolean;
  preMatch: boolean;
  preMatchOffset: '15' | '30' | '60';
  createdAt: string;
}

const KEY = '@nilnil_alarms';

export async function loadAlarms(): Promise<SavedAlarm[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as SavedAlarm[]) : [];
}

export async function saveAlarm(alarm: SavedAlarm): Promise<void> {
  const list = await loadAlarms();
  const idx = list.findIndex(a => a.id === alarm.id);
  if (idx >= 0) list[idx] = alarm;
  else list.push(alarm);
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function removeAlarm(id: string): Promise<void> {
  const list = await loadAlarms();
  await AsyncStorage.setItem(KEY, JSON.stringify(list.filter(a => a.id !== id)));
}
