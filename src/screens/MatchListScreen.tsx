import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { Match, MatchSection, formatKickoff } from '../data/matches';
import { useFixtures } from '../hooks/useFixtures';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MatchList'>;
  route: RouteProp<RootStackParamList, 'MatchList'>;
};

export default function MatchListScreen({ navigation, route }: Props) {
  const { team } = route.params;
  const { sections, loading, error } = useFixtures(team);

  const handleMatchPress = (match: Match) => {
    navigation.navigate('AlarmSettings', { team, match });
  };

  const renderMatch = ({ item: match }: { item: Match }) => {
    const isHome = match.homeTeam.id === team.id;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleMatchPress(match)}
        activeOpacity={0.75}
      >
        <View style={styles.cardTop}>
          <Text style={styles.competition}>{match.competition}</Text>
          <Text style={styles.kickoff}>{formatKickoff(match.kickoff)}</Text>
        </View>

        <View style={styles.teamsRow}>
          <View style={styles.teamSide}>
            <Image source={{ uri: match.homeTeam.badgeUrl }} style={styles.teamBadge} resizeMode="contain" />
            <Text
              style={[styles.teamName, match.homeTeam.id === team.id && styles.myTeam]}
              numberOfLines={1}
            >
              {match.homeTeam.shortName}
            </Text>
          </View>

          <Text style={styles.vs}>vs</Text>

          <View style={[styles.teamSide, styles.teamSideRight]}>
            <Image source={{ uri: match.awayTeam.badgeUrl }} style={styles.teamBadge} resizeMode="contain" />
            <Text
              style={[styles.teamName, match.awayTeam.id === team.id && styles.myTeam]}
              numberOfLines={1}
            >
              {match.awayTeam.shortName}
            </Text>
          </View>
        </View>

        <View style={styles.cardBottom}>
          <View style={[styles.venuePill, isHome ? styles.pillHome : styles.pillAway]}>
            <Text style={[styles.venueText, isHome ? styles.venueTextHome : styles.venueTextAway]}>
              {isHome ? 'HOME' : 'AWAY'}
            </Text>
          </View>
          <View style={styles.alarmCta}>
            <Text style={styles.alarmCtaText}>Set alarm</Text>
            <Text style={styles.alarmCtaArrow}>›</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: MatchSection }) => (
    <Text style={styles.sectionHeader}>{section.title}</Text>
  );

  const renderBody = () => {
    if (loading && sections.length === 0) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      );
    }
    if (error && sections.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Could not load fixtures</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
        </View>
      );
    }
    return (
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderMatch}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyTitle}>No upcoming fixtures</Text>
            <Text style={styles.emptySubtitle}>Check back soon</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Image source={{ uri: team.badgeUrl }} style={styles.headerBadge} resizeMode="contain" />
          <View>
            <Text style={styles.headerTeam}>{team.shortName}</Text>
            <Text style={styles.headerSub}>Upcoming fixtures</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.changeButton}
          onPress={() => navigation.navigate('TeamSelection')}
        >
          <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>
      </View>

      {renderBody()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
  },
  backArrow: {
    fontSize: 28,
    color: colors.text,
    lineHeight: 30,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBadge: {
    width: 32,
    height: 32,
  },
  headerTeam: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  headerSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  changeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
  },
  changeText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.2,
    marginTop: 20,
    marginBottom: 8,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
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
  kickoff: {
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
  teamBadge: {
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
    fontWeight: '500',
  },

  cardBottom: {
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
  alarmCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  alarmCtaText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  alarmCtaArrow: {
    fontSize: 18,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
