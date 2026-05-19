import React, { useState } from 'react';

import {
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { formatKickoff, formatSectionTitle, Match } from '../data/matches';
import { Team } from '../data/teams';
import { saveAlarm, SavedAlarm } from '../data/alarms';
import { getStoredDeviceToken } from '../services/pushNotifications';
import { deriveAlarmType, registerAlarmWithBackend } from '../services/backendApi';
import { getSelectedSoundId, getSoundById } from '../data/sounds';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'AlarmSettings'>;
  route: RouteProp<HomeStackParamList, 'AlarmSettings'>;
};

type PreMatchOffset = '15' | '30' | '60';

export default function AlarmSettingsScreen({ navigation, route }: Props) {
  const { team, match } = route.params;

  const [myTeamScores, setMyTeamScores] = useState(true);
  const [anyGoal, setAnyGoal] = useState(false);
  const [firstGoal, setFirstGoal] = useState(false);
  const [preMatch, setPreMatch] = useState(false);
  const [offset, setOffset] = useState<PreMatchOffset>('30');

  const isHome = match.homeTeam.id === team.id;
  const opponent = isHome ? match.awayTeam : match.homeTeam;
  const canConfirm = myTeamScores || anyGoal || firstGoal || preMatch;

  const handleConfirm = async () => {
    console.log('[AlarmSettings] handleConfirm triggered', { myTeamScores, anyGoal, firstGoal, preMatch });

    await saveAlarm({
      id: `${match.id}_${team.id}`,
      matchId: match.id,
      team,
      match,
      myTeamScores,
      anyGoal,
      firstGoal,
      preMatch,
      preMatchOffset: offset,
      createdAt: new Date().toISOString(),
    });
    console.log('[AlarmSettings] alarm saved locally');

    const alarmType = deriveAlarmType(myTeamScores, anyGoal, firstGoal);
    console.log('[AlarmSettings] derived alarmType:', alarmType);

    if (alarmType) {
      const deviceToken = await getStoredDeviceToken();
      console.log('[AlarmSettings] deviceToken from storage:', deviceToken ? `${deviceToken.slice(0, 8)}…` : 'NULL — token not stored!');

      if (deviceToken) {
        const soundId = await getSelectedSoundId();
        const sound = getSoundById(soundId);
        console.log('[AlarmSettings] calling registerAlarmWithBackend', {
          teamId: Number(team.id),
          teamName: team.name,
          alarmType,
          soundName: sound.apnsSound,
        });
        registerAlarmWithBackend({
          deviceToken,
          teamId: Number(team.id),
          teamName: team.name,
          alarmType,
          soundName: sound.apnsSound,
        })
          .then(() => console.log('[AlarmSettings] registerAlarmWithBackend succeeded'))
          .catch((err) => console.error('[AlarmSettings] registerAlarmWithBackend FAILED:', err));
      } else {
        console.warn('[AlarmSettings] skipping backend registration — no device token stored');
      }
    } else {
      console.log('[AlarmSettings] skipping backend registration — no goal alarm type selected (preMatch only?)');
    }

    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Alarm</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <MatchCard match={match} team={team} isHome={isHome} opponent={opponent} />

        <Text style={styles.sectionLabel}>GOAL ALARM</Text>

        <View style={styles.settingsGroup}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>When {team.shortName} scores</Text>
            </View>
            <Switch
              value={myTeamScores}
              onValueChange={setMyTeamScores}
              trackColor={{ false: colors.surfaceElevated, true: colors.accentMuted }}
              thumbColor={myTeamScores ? colors.accent : colors.textMuted}
              ios_backgroundColor={colors.surfaceElevated}
            />
          </View>

          <View style={styles.rowSeparator} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Any goal</Text>
            </View>
            <Switch
              value={anyGoal}
              onValueChange={setAnyGoal}
              trackColor={{ false: colors.surfaceElevated, true: colors.accentMuted }}
              thumbColor={anyGoal ? colors.accent : colors.textMuted}
              ios_backgroundColor={colors.surfaceElevated}
            />
          </View>

          <View style={styles.rowSeparator} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>First goal</Text>
            </View>
            <Switch
              value={firstGoal}
              onValueChange={setFirstGoal}
              trackColor={{ false: colors.surfaceElevated, true: colors.accentMuted }}
              thumbColor={firstGoal ? colors.accent : colors.textMuted}
              ios_backgroundColor={colors.surfaceElevated}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>PRE-MATCH</Text>

        <View style={styles.settingsGroup}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Pre-match alarm</Text>
              <Text style={styles.settingSubLabel}>
                Wake up before the {formatKickoff(match.kickoff)} kickoff
              </Text>
            </View>
            <Switch
              value={preMatch}
              onValueChange={setPreMatch}
              trackColor={{ false: colors.surfaceElevated, true: colors.accentMuted }}
              thumbColor={preMatch ? colors.accent : colors.textMuted}
              ios_backgroundColor={colors.surfaceElevated}
            />
          </View>

          {preMatch && (
            <View style={styles.offsetRow}>
              {(['15', '30', '60'] as PreMatchOffset[]).map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.offsetPill, offset === val && styles.offsetPillActive]}
                  onPress={() => setOffset(val)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.offsetText, offset === val && styles.offsetTextActive]}>
                    {val === '60' ? '1 hour' : `${val} min`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

      </ScrollView>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={!canConfirm}
          activeOpacity={0.85}
        >
          <Text style={[styles.confirmButtonText, !canConfirm && styles.confirmButtonTextDisabled]}>
            Set Alarm
          </Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MatchCard({
  match,
  team,
  isHome,
  opponent,
}: {
  match: Match;
  team: Team;
  isHome: boolean;
  opponent: Team;
}) {
  return (
    <View style={styles.matchCard}>
      <View style={styles.matchCardTop}>
        <Text style={styles.competition}>{match.competition}</Text>
        <Text style={styles.kickoffTime}>{formatKickoff(match.kickoff)}</Text>
      </View>

      <View style={styles.teamsRow}>
        <View style={styles.teamSide}>
          <Image source={{ uri: match.homeTeam.badgeUrl }} style={styles.badge} resizeMode="contain" />
          <Text
            style={[styles.teamName, match.homeTeam.id === team.id && styles.myTeam]}
            numberOfLines={1}
          >
            {match.homeTeam.shortName}
          </Text>
        </View>

        <Text style={styles.vs}>vs</Text>

        <View style={[styles.teamSide, styles.teamSideRight]}>
          <Image source={{ uri: match.awayTeam.badgeUrl }} style={styles.badge} resizeMode="contain" />
          <Text
            style={[styles.teamName, match.awayTeam.id === team.id && styles.myTeam]}
            numberOfLines={1}
          >
            {match.awayTeam.shortName}
          </Text>
        </View>
      </View>

      <View style={styles.matchCardBottom}>
        <View style={[styles.venuePill, isHome ? styles.pillHome : styles.pillAway]}>
          <Text style={[styles.venueText, isHome ? styles.venueTextHome : styles.venueTextAway]}>
            {isHome ? 'HOME' : 'AWAY'}
          </Text>
        </View>
        <Text style={styles.matchDate}>{formatSectionTitle(match.kickoff)}</Text>
      </View>
    </View>
  );
}


// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
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
    paddingBottom: 120,
  },

  // Match recap card
  matchCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 28,
  },
  matchCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  competition: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  kickoffTime: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  teamSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamSideRight: {
    justifyContent: 'flex-end',
    flexDirection: 'row-reverse',
  },
  badge: {
    width: 30,
    height: 30,
    flexShrink: 0,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  myTeam: {
    color: colors.accent,
  },
  vs: {
    fontSize: 12,
    color: colors.textMuted,
    marginHorizontal: 10,
  },
  matchCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  venuePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillHome: { backgroundColor: colors.accentMuted },
  pillAway: { backgroundColor: colors.surfaceElevated },
  venueText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  venueTextHome: { color: colors.accent },
  venueTextAway: { color: colors.textSecondary },
  matchDate: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Settings section
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  settingsGroup: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 3,
  },
  settingSubLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  accentText: {
    color: colors.accent,
    fontWeight: '600',
  },
  rowSeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },

  // Offset pills
  offsetRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  offsetPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  offsetPillActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  offsetText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  offsetTextActive: {
    color: colors.accent,
  },

  // Footer CTA
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: colors.surfaceElevated,
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.black,
  },
  confirmButtonTextDisabled: {
    color: colors.textMuted,
  },
});
