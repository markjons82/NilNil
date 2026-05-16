import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@nilnil_device_token';

export async function setupPushNotifications(): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = tokenData.data as string;
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch {
    return null;
  }
}

export async function getStoredDeviceToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}
