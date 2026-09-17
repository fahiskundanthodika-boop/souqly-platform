// Rider App Navigation
import { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import DeliveryScreen from '../screens/DeliveryScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const [isLoggedIn, setIsLoggedIn] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('rider_token').then(token => setIsLoggedIn(!!token));
  }, []);

  if (isLoggedIn === null) return null;

  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#1A1A2E' }, headerTintColor: 'white', headerTitleStyle: { fontWeight: 'bold' } }}>
      {isLoggedIn ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'My Deliveries' }} />
          <Stack.Screen name="Delivery" component={DeliveryScreen} options={{ title: 'Delivery Details' }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
