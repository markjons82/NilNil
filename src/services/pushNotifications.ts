import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@nilnil_device_token';

export async function setupPushNotifications(): Promise<string | null> {
  if (Platform.OS !== 'ios') {
    console.log('[pushNotifications] not iOS, skipping');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log('[pushNotifications] existing permission status:', existingStatus);
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log('[pushNotifications] requested permission, result:', finalStatus);
  }

  if (finalStatus !== 'granted') {
    console.warn('[pushNotifications] permission not granted — no device token will be stored');
    return null;
  }

  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = tokenData.data as string;
    console.log('[pushNotifications] token obtained and stored:', `${token.slice(0, 8)}…`);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch (err) {
    console.error('[pushNotifications] failed to get device token:', err);
    return null;
  }
}

export async function getStoredDeviceToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}
