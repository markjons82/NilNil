import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AlarmSound {
  id: string;
  apnsSound: string;       // value sent in APNs payload sound field
  name: string;
  description: string;
  isSystem: boolean;       // true = iOS system sound, no bundled file, no in-app preview
  file?: ReturnType<typeof require>;
}

export const CUSTOM_SOUNDS: AlarmSound[] = [
  {
    id: 'goal_alarm',
    apnsSound: 'goal_alarm.wav',
    name: 'Goal Alarm',
    description: 'Ascending 4-note alert',
    isSystem: false,
    file: require('../../assets/sounds/goal_alarm.wav'),
  },
  {
    id: 'stadium_horn',
    apnsSound: 'stadium_horn.wav',
    name: 'Stadium Horn',
    description: 'Deep sustained horn blast',
    isSystem: false,
    file: require('../../assets/sounds/stadium_horn.wav'),
  },
  {
    id: 'match_whistle',
    apnsSound: 'match_whistle.wav',
    name: 'Match Whistle',
    description: 'Two sharp referee whistles',
    isSystem: false,
    file: require('../../assets/sounds/match_whistle.wav'),
  },
];

// iOS system alert tones — resolved by the OS from its own sound library.
// These are the same sounds listed under Settings → Sounds → Alert Tones.
// Cannot be previewed in-app (iOS sandbox blocks /System/Library/Audio/UISounds/).
export const SYSTEM_SOUNDS: AlarmSound[] = [
  {
    id: 'system_default',
    apnsSound: 'default',
    name: 'Default',
    description: 'Your current iOS notification sound',
    isSystem: true,
  },
  {
    id: 'system_beacon',
    apnsSound: 'Beacon.caf',
    name: 'Beacon',
    description: 'Pulsing beacon tone',
    isSystem: true,
  },
  {
    id: 'system_chime',
    apnsSound: 'Chime.caf',
    name: 'Chime',
    description: 'Gentle chime',
    isSystem: true,
  },
  {
    id: 'system_alarm',
    apnsSound: 'Alarm.caf',
    name: 'Alarm',
    description: 'Urgent alarm tone',
    isSystem: true,
  },
];

export const ALL_SOUNDS: AlarmSound[] = [...CUSTOM_SOUNDS, ...SYSTEM_SOUNDS];

const SOUND_KEY = '@nilnil_alarm_sound';

export async function getSelectedSoundId(): Promise<string> {
  return (await AsyncStorage.getItem(SOUND_KEY)) ?? 'goal_alarm';
}

export async function setSelectedSoundId(id: string): Promise<void> {
  await AsyncStorage.setItem(SOUND_KEY, id);
}

export function getSoundById(id: string): AlarmSound {
  return ALL_SOUNDS.find(s => s.id === id) ?? CUSTOM_SOUNDS[0];
}
