import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import TeamSelectionScreen from '../screens/TeamSelectionScreen';
import MatchListScreen from '../screens/MatchListScreen';
import AlarmSettingsScreen from '../screens/AlarmSettingsScreen';
import ActiveAlarmsScreen from '../screens/ActiveAlarmsScreen';
import { Team } from '../data/teams';
import { Match } from '../data/matches';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  TeamSelection: undefined;
  MatchList: { team: Team };
  AlarmSettings: { team: Team; match: Match };
  ActiveAlarms: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="TeamSelection" component={TeamSelectionScreen} />
        <Stack.Screen name="MatchList" component={MatchListScreen} />
        <Stack.Screen name="AlarmSettings" component={AlarmSettingsScreen} />
        <Stack.Screen name="ActiveAlarms" component={ActiveAlarmsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
