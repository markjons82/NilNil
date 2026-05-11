import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

const ONBOARDING_KEY = '@nilnil_onboarding_complete';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Splash'>;
};

export default function SplashScreen({ navigation }: Props) {
  const opacity = new Animated.Value(0);
  const scale = new Animated.Value(0.85);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(async () => {
      const done = await AsyncStorage.getItem(ONBOARDING_KEY);
      navigation.replace(done ? 'TeamSelection' : 'Onboarding');
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#0D1F0D', '#0A0F0A', '#050A05']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
        <View style={styles.iconWrapper}>
          <View style={styles.circle} />
        </View>
        <Text style={styles.title}>Nil Nil</Text>
        <Text style={styles.subtitle}>Goal Alarm</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  iconWrapper: {
    marginBottom: 28,
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F0FDF4',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
});
