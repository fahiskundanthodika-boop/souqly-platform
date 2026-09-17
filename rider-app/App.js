// Rider App root - entry point for delivery staff
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#1A1A2E" />
      <AppNavigator />
    </NavigationContainer>
  );
}
