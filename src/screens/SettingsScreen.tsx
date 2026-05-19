import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import {
  CUSTOM_SOUNDS,
  SYSTEM_SOUNDS,
  AlarmSound,
  getSelectedSoundId,
  setSelectedSoundId,
} from '../data/sounds';
import { getStoredDeviceToken } from '../services/pushNotifications';

const BACKEND_URL = 'https://nilnil-production.up.railway.app';

export default function SettingsScreen() {
  const [selectedId, setSelectedId] = useState('goal_alarm');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const [deviceToken, setDeviceToken] = useState<string | null | undefined>(undefined);
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    getSelectedSoundId().then(setSelectedId);
    getStoredDeviceToken().then(setDeviceToken);
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  const sendTest = useCallback(async () => {
    if (!deviceToken) return;
    setTestStatus('sending');
    setTestMessage('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/alarms/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceToken }),
      });
      const json = await res.json();
      if (res.ok) {
        setTestStatus('ok');
        setTestMessage(json.message ?? 'Sent!');
      } else {
        setTestStatus('error');
        setTestMessage(json.error ?? `HTTP ${res.status}`);
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(err.message ?? 'Network error');
    }
  }, [deviceToken]);

  const stopCurrent = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setPlayingId(null);
  }, []);

  const preview = useCallback(async (sound: AlarmSound) => {
    await stopCurrent();
    if (!sound.file) return;
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound: av } = await Audio.Sound.createAsync(sound.file);
      soundRef.current = av;
      setPlayingId(sound.id);
      await av.playAsync();
      av.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
          av.unloadAsync();
          soundRef.current = null;
          setPlayingId(null);
        }
      });
    } catch {
      setPlayingId(null);
    }
  }, [stopCurrent]);

  const select = useCallback(async (sound: AlarmSound) => {
    setSelectedId(sound.id);
    await setSelectedSoundId(sound.id);
    if (!sound.isSystem) preview(sound);
  }, [preview]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>ALARM SOUND</Text>
        <Text style={styles.sectionSubtitle}>Plays when a goal is scored</Text>

        <Text style={styles.groupLabel}>CUSTOM</Text>
        <SoundGroup
          sounds={CUSTOM_SOUNDS}
          selectedId={selectedId}
          playingId={playingId}
          onSelect={select}
          onPreview={(s) => playingId === s.id ? stopCurrent() : preview(s)}
        />

        <Text style={styles.groupLabel}>SYSTEM</Text>
        <SoundGroup
          sounds={SYSTEM_SOUNDS}
          selectedId={selectedId}
          playingId={playingId}
          onSelect={select}
          onPreview={() => {}}
        />

        <Text style={styles.systemNote}>
          System sounds cannot be previewed in-app. They play when a goal notification arrives.
        </Text>

        {/* ── Debug panel ── */}
        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>DEBUG</Text>

        <View style={styles.debugPanel}>
          <Text style={styles.debugLabel}>DEVICE TOKEN</Text>
          {deviceToken === undefined ? (
            <ActivityIndicator size="small" color={colors.textMuted} style={{ marginVertical: 8 }} />
          ) : deviceToken ? (
            <TextInput
              style={styles.debugToken}
              value={deviceToken}
              editable={false}
              multiline
              selectTextOnFocus
            />
          ) : (
            <Text style={styles.debugNone}>Not stored — push permissions may be denied</Text>
          )}

          <TouchableOpacity
            style={[styles.testButton, !deviceToken && styles.testButtonDisabled]}
            onPress={sendTest}
            disabled={!deviceToken || testStatus === 'sending'}
            activeOpacity={0.8}
          >
            {testStatus === 'sending' ? (
              <ActivityIndicator size="small" color={colors.black} />
            ) : (
              <Text style={[styles.testButtonText, !deviceToken && styles.testButtonTextDisabled]}>
                Send Test Notification
              </Text>
            )}
          </TouchableOpacity>

          {testMessage !== '' && (
            <Text style={[styles.testResult, testStatus === 'error' && styles.testResultError]}>
              {testStatus === 'ok' ? '✓ ' : '✗ '}{testMessage}
            </Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sound group sub-component ────────────────────────────────────────────────

function SoundGroup({
  sounds,
  selectedId,
  playingId,
  onSelect,
  onPreview,
}: {
  sounds: AlarmSound[];
  selectedId: string;
  playingId: string | null;
  onSelect: (s: AlarmSound) => void;
  onPreview: (s: AlarmSound) => void;
}) {
  return (
    <View style={styles.listGroup}>
      {sounds.map((sound, index) => {
        const isSelected = sound.id === selectedId;
        const isPlaying = sound.id === playingId;
        const isLast = index === sounds.length - 1;

        return (
          <View key={sound.id}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => onSelect(sound)}
              activeOpacity={0.7}
            >
              <View style={styles.checkContainer}>
                {isSelected && (
                  <Ionicons name="checkmark" size={20} color={colors.accent} />
                )}
              </View>

              <View style={styles.soundInfo}>
                <Text style={[styles.soundName, isSelected && styles.soundNameSelected]}>
                  {sound.name}
                </Text>
                <Text style={styles.soundDesc}>{sound.description}</Text>
              </View>

              {sound.isSystem ? (
                <View style={styles.deviceBadge}>
                  <Ionicons name="phone-portrait-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.deviceBadgeText}>On device</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={() => onPreview(sound)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={isPlaying ? 'stop-circle' : 'play-circle'}
                    size={30}
                    color={isSelected ? colors.accent : colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {!isLast && <View style={styles.separator} />}
          </View>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 20,
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  listGroup: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  checkContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  soundInfo: {
    flex: 1,
  },
  soundName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  soundNameSelected: {
    color: colors.accent,
  },
  soundDesc: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  playButton: {
    marginLeft: 12,
  },
  deviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 12,
  },
  deviceBadgeText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  systemNote: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
  },

  // Debug panel
  debugPanel: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  debugLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  debugToken: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: colors.accent,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: 10,
    lineHeight: 18,
  },
  debugNone: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  testButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  testButtonDisabled: {
    backgroundColor: colors.surfaceElevated,
  },
  testButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.black,
  },
  testButtonTextDisabled: {
    color: colors.textMuted,
  },
  testResult: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
    textAlign: 'center',
  },
  testResultError: {
    color: '#EF4444',
  },
});
