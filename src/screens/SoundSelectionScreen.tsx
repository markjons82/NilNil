import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import {
  CUSTOM_SOUNDS,
  SYSTEM_SOUNDS,
  AlarmSound,
  getSelectedSoundId,
  setSelectedSoundId,
} from '../data/sounds';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'SoundSelection'>;
};

export default function SoundSelectionScreen({ navigation }: Props) {
  const [selectedId, setSelectedId] = useState('goal_alarm');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    getSelectedSoundId().then(setSelectedId);
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alarm Sound</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>CUSTOM SOUNDS</Text>
        <SoundGroup
          sounds={CUSTOM_SOUNDS}
          selectedId={selectedId}
          playingId={playingId}
          onSelect={select}
          onPreview={(s) => playingId === s.id ? stopCurrent() : preview(s)}
        />

        <Text style={styles.sectionLabel}>SYSTEM SOUNDS</Text>
        <SoundGroup
          sounds={SYSTEM_SOUNDS}
          selectedId={selectedId}
          playingId={playingId}
          onSelect={select}
          onPreview={() => {}}
        />

        <Text style={styles.systemNote}>
          System sounds play on device when the notification arrives and cannot be previewed in-app.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backArrow: {
    fontSize: 28,
    color: colors.text,
    lineHeight: 30,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
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
    marginBottom: 10,
  },
  listGroup: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 24,
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
});
