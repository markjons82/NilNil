import React, { useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Team } from '../data/teams';
import { colors } from '../theme/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTeams } from '../hooks/useTeams';

const FAVORITES_KEY = '@nilnil_favorites';
const ONBOARDING_KEY = '@nilnil_onboarding_complete';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

export default function OnboardingScreen({ navigation }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { teams, loading } = useTeams();

  const toggleTeam = (teamId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const handleGetStarted = async () => {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([...selectedIds]));
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    navigation.replace('TeamSelection');
  };

  const renderItem = ({ item }: { item: Team }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.teamRow, isSelected && styles.teamRowSelected]}
        onPress={() => toggleTeam(item.id)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.badgeUrl }}
          style={styles.badge}
          resizeMode="contain"
        />
        <Text style={styles.teamName}>{item.name}</Text>
        <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
          {isSelected && <Text style={styles.checkMark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <Text style={styles.title}>Welcome to Nil Nil</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList<Team>
          data={teams}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={handleGetStarted}
          activeOpacity={0.85}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  teamRowSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  badge: {
    width: 44,
    height: 44,
  },
  teamName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 14,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkMark: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.black,
    lineHeight: 18,
  },
  separator: {
    height: 6,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  getStartedButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
  },
});
