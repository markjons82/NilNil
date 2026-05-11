import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Team } from '../data/teams';
import { colors } from '../theme/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useFavorites } from '../hooks/useFavorites';
import { useTeams } from '../hooks/useTeams';
import { loadAlarms } from '../data/alarms';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TeamSelection'>;
};

type SectionDivider = { __type: 'divider' };
type SectionHeader = { __type: 'header'; label: string };
type ListItem = Team | SectionDivider | SectionHeader;

export default function TeamSelectionScreen({ navigation }: Props) {
  const [alarmCount, setAlarmCount] = useState(0);
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { teams, loading, error } = useTeams();

  useFocusEffect(useCallback(() => {
    loadAlarms().then(list => setAlarmCount(list.length));
  }, []));

  const sortedData = useMemo<ListItem[]>(() => {
    const favs = teams.filter(t => favoriteIds.has(t.id));
    const rest = teams.filter(t => !favoriteIds.has(t.id));
    if (favs.length === 0) return rest;
    return [
      { __type: 'header' as const, label: 'Favourites' },
      ...favs,
      { __type: 'divider' as const },
      ...rest,
    ];
  }, [favoriteIds, teams]);

  const renderItem = ({ item }: { item: ListItem }) => {
    if ('__type' in item) {
      if (item.__type === 'header') {
        return <Text style={styles.sectionLabel}>{item.label}</Text>;
      }
      return <View style={styles.sectionDivider} />;
    }
    const isFav = favoriteIds.has(item.id);
    return (
      <TouchableOpacity
        style={styles.teamRow}
        onPress={() => navigation.navigate('MatchList', { team: item })}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.badgeUrl }}
          style={styles.badge}
          resizeMode="contain"
        />
        <View style={styles.teamInfo}>
          <Text style={styles.teamName}>{item.name}</Text>
          <Text style={styles.league}>Premier League</Text>
        </View>
        <TouchableOpacity
          style={styles.starButton}
          onPress={() => toggleFavorite(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.6}
        >
          <Text style={[styles.star, isFav && styles.starActive]}>
            {isFav ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
        <View style={styles.chevron}>
          <Text style={styles.chevronText}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Choose Your Team</Text>
        </View>
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => navigation.navigate('ActiveAlarms')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={alarmCount > 0 ? 'notifications' : 'notifications-outline'}
            size={26}
            color={alarmCount > 0 ? colors.accent : colors.textSecondary}
          />
          {alarmCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{alarmCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Could not load teams</Text>
          <Text style={styles.errorSub}>{error}</Text>
        </View>
      ) : (
        <FlatList<ListItem>
          data={sortedData}
          keyExtractor={(item) => ('__type' in item ? item.__type : item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  bellButton: {
    paddingTop: 4,
  },
  bellBadge: {
    position: 'absolute',
    top: 0,
    right: -4,
    backgroundColor: colors.accent,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.black,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  badge: {
    width: 44,
    height: 44,
  },
  teamInfo: {
    flex: 1,
    marginLeft: 14,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  league: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  starButton: {
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  star: {
    fontSize: 22,
    color: colors.textMuted,
    lineHeight: 26,
  },
  starActive: {
    color: colors.accent,
  },
  chevron: {
    paddingLeft: 4,
  },
  chevronText: {
    fontSize: 22,
    color: colors.textMuted,
    lineHeight: 26,
  },
  separator: {
    height: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
    marginHorizontal: 4,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  errorSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
