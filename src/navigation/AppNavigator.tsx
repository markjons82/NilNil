import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import TeamSelectionScreen from '../screens/TeamSelectionScreen';
import MatchListScreen from '../screens/MatchListScreen';
import AlarmSettingsScreen from '../screens/AlarmSettingsScreen';
import SoundSelectionScreen from '../screens/SoundSelectionScreen';
import ActiveAlarmsScreen from '../screens/ActiveAlarmsScreen';
import SettingsScreen from '../screens/SettingsScreen';

import { colors } from '../theme/colors';
import { loadAlarms } from '../data/alarms';
import { Team } from '../data/teams';
import { Match } from '../data/matches';

// ─── Type definitions ─────────────────────────────────────────────────────────

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Tabs: undefined;
};

export type TabParamList = {
  Home: undefined;
  Alarms: undefined;
  Settings: undefined;
};

export type HomeStackParamList = {
  TeamSelection: undefined;
  MatchList: { team: Team };
  AlarmSettings: { team: Team; match: Match };
  SoundSelection: undefined;
};

// ─── Navigators ───────────────────────────────────────────────────────────────

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="TeamSelection" component={TeamSelectionScreen} />
      <HomeStack.Screen name="MatchList" component={MatchListScreen} />
      <HomeStack.Screen name="AlarmSettings" component={AlarmSettingsScreen} />
      <HomeStack.Screen name="SoundSelection" component={SoundSelectionScreen} />
    </HomeStack.Navigator>
  );
}

function AlarmTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const [count, setCount] = useState(0);

  useFocusEffect(useCallback(() => {
    loadAlarms().then(list => setCount(list.length));
  }, []));

  return (
    <View>
      <Ionicons
        name={focused ? 'notifications' : 'notifications-outline'}
        size={24}
        color={color}
      />
      {count > 0 && (
        <View style={tabStyles.badge}>
          <Text style={tabStyles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </View>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabStyles.bar,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: tabStyles.label,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeNavigator}
        options={{
          tabBarLabel: 'Teams',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'football' : 'football-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Alarms"
        component={ActiveAlarmsScreen}
        options={{
          tabBarLabel: 'Alarms',
          tabBarIcon: ({ color, focused }) => (
            <AlarmTabIcon color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Splash" component={SplashScreen} />
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        <RootStack.Screen name="Tabs" component={TabNavigator} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

// ─── Tab bar styles ───────────────────────────────────────────────────────────

const tabStyles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 6,
    height: 80,
    paddingBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.accent,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.black,
  },
});
