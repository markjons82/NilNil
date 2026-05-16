const BACKEND_URL = 'https://nilnil-production.up.railway.app';

export type AlarmType = 'my_team' | 'any_goal' | 'first_goal';

export function deriveAlarmType(
  myTeamScores: boolean,
  anyGoal: boolean,
  firstGoal: boolean,
): AlarmType | null {
  if (anyGoal) return 'any_goal';
  if (myTeamScores) return 'my_team';
  if (firstGoal) return 'first_goal';
  return null;
}

export async function registerAlarmWithBackend(params: {
  deviceToken: string;
  teamId: number;
  teamName: string;
  alarmType: AlarmType;
}): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/api/alarms/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Register failed (${response.status}): ${body}`);
  }
}
