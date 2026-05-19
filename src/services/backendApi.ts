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
  soundName?: string;
}): Promise<void> {
  console.log('[backendApi] POST /api/alarms/register', {
    ...params,
    deviceToken: `${params.deviceToken.slice(0, 8)}…`,
  });
  const response = await fetch(`${BACKEND_URL}/api/alarms/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  console.log('[backendApi] response status:', response.status);
  if (!response.ok) {
    const body = await response.text();
    console.error('[backendApi] error body:', body);
    throw new Error(`Register failed (${response.status}): ${body}`);
  }
}
