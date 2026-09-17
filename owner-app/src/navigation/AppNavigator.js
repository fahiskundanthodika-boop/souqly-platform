// Navigation - decides which screens to show (login if not logged in, tabs if logged in)
import { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ProductsScreen from '../screens/ProductsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom tab navigation for logged-in owners
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { borderTopWidth: 1, borderTopColor: '#f0f0f0', height: 60 },
        headerStyle: { backgroundColor: '#FF6B35' },
        headerTintColor: 'white',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen}
        options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📊</Text> }} />
      <Tab.Screen name="Orders" component={OrdersScreen}
        options={{ title: 'Orders', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📦</Text> }} />
      <Tab.Screen name="Products" component={ProductsScreen}
        options={{ title: 'Products', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🛍️</Text> }} />
      <Tab.Screen name="Settings" component={SettingsScreen}
        options={{ title: 'Settings', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>⚙️</Text> }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [isLoggedIn, setIsLoggedIn] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('owner_token').then(token => {
      setIsLoggedIn(!!token);
    });
  }, []);

  if (isLoggedIn === null) return null; // Loading

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
