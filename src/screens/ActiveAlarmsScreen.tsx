import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { SavedAlarm, loadAlarms, removeAlarm } from '../data/alarms';
import { formatSectionTitle, formatKickoff } from '../data/matches';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ActiveAlarms'>;
};

export default function ActiveAlarmsScreen({ navigation }: Props) {
  const [alarms, setAlarms] = useState<SavedAlarm[]>([]);

  const refresh = useCallback(async () => {
    const list = await loadAlarms();
    list.sort((a, b) => {
      if (!a.match || !b.match) return 0;
      return a.match.kickoff.localeCompare(b.match.kickoff);
    });
    setAlarms(list);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const handleRemove = async (id: string) => {
    await removeAlarm(id);
    setAlarms(prev => prev.filter(a => a.id !== id));
  };

  const renderAlarm = ({ item }: { item: SavedAlarm }) => {
    const match = item.match;
    if (!match) return null;

    const chips: string[] = [];
    if (item.myTeamScores) chips.push('My team');
    if (item.anyGoal) chips.push('Any goal');
    if (item.firstGoal) chips.push('First goal');
    if (item.preMatch) {
      chips.push(item.preMatchOffset === '60' ? '1 hr before' : `${item.preMatchOffset} min before`);
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Image source={{ uri: item.team.badgeUrl }} style={styles.badge} resizeMode="contain" />
          <View style={styles.matchInfo}>
            <Text style={styles.matchTitle} numberOfLines={1}>
              <Text style={match.homeTeam.id === item.team.id ? styles.myTeam : styles.opponent}>
                {match.homeTeam.shortName}
              </Text>
              <Text style={styles.vs}> vs </Text>
              <Text style={match.awayTeam.id === item.team.id ? styles.myTeam : styles.opponent}>
                {match.awayTeam.shortName}
              </Text>
            </Text>
            <Text style={styles.matchDate}>
              {formatSectionTitle(match.kickoff)} · {formatKickoff(match.kickoff)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemove(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {chips.length > 0 && (
          <View style={styles.chips}>
            {chips.map(chip => (
              <View key={chip} style={styles.chip}>
                <Text style={styles.chipText}>{chip}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>Active Alarms</Text>
        <View style={{ width: 24 }} />
      </View>

      {alarms.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={52} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No alarms set</Text>
          <Text style={styles.emptySubtitle}>Set alarms from the match list</Text>
        </View>
      ) : (
        <FlatList
          data={alarms}
          keyExtractor={item => item.id}
          renderItem={renderAlarm}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
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

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  list: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    width: 36,
    height: 36,
    marginRight: 12,
  },
  matchInfo: {
    flex: 1,
  },
  matchTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  myTeam: {
    color: colors.accent,
  },
  opponent: {
    color: colors.text,
  },
  vs: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  matchDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  removeButton: {
    marginLeft: 12,
    padding: 4,
  },

  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chip: {
    backgroundColor: colors.accentMuted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
    letterSpacing: 0.3,
  },
});
