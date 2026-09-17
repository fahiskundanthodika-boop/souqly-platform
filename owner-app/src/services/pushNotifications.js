// Registers this device for push notifications and saves the FCM token to backend
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// Show the notification banner + sound even while the app is open (foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('Push notifications need a real device (not a simulator)');
    return null;
  }

  // Android needs a notification channel with sound configured
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'New Orders',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
    });
  }

  // Ask the user for permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  // Get the native FCM device token (Android) — matches what firebase-admin sends to
  try {
    const tokenResponse = await Notifications.getDevicePushTokenAsync();
    const fcmToken = tokenResponse.data;

    // Save token to backend so it can send pushes for this shop
    await saveFcmToken(fcmToken);

    return fcmToken;
  } catch (err) {
    console.log('Could not get push token:', err.message);
    return null;
  }
}

export async function saveFcmToken(fcmToken) {
  if (!fcmToken) return;
  try {
    const ownerToken = await AsyncStorage.getItem('owner_token');
    if (!ownerToken) return; // not logged in yet — will save right after login instead
    await api.put('/shop/fcm-token', { fcmToken });
    await AsyncStorage.setItem('fcm_token', fcmToken);
  } catch (err) {
    console.log('Could not save push token to server:', err.message);
  }
}
