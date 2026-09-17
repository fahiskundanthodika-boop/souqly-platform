// Owner App root - entry point for the Souqly shop owner mobile app
import { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications } from './src/services/pushNotifications';

export default function App() {
  const navigationRef = useRef(null);

  useEffect(() => {
    // Ask for permission + register device for push notifications on app start
    registerForPushNotifications();

    // Tapping a notification (app was background/closed) opens the Orders screen
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.screen && navigationRef.current) {
        navigationRef.current.navigate('Main', { screen: data.screen });
      }
    });

    // Notification arrives while app is open (foreground) — handled automatically
    // by setNotificationHandler in pushNotifications.js (banner + sound shown)
    const receivedSub = Notifications.addNotificationReceivedListener(() => {});

    return () => {
      responseSub.remove();
      receivedSub.remove();
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="light" backgroundColor="#FF6B35" />
      <AppNavigator />
    </NavigationContainer>
  );
}
