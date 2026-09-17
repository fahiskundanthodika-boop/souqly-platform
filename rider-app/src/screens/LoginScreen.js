// Rider Login - uses phone number + 4-digit PIN
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || pin.length !== 4) { Alert.alert('Error', 'Enter phone and 4-digit PIN'); return; }
    setLoading(true);
    try {
      const res = await api.post('/riders/login', { phone, pin });
      await AsyncStorage.setItem('rider_token', res.data.token);
      await AsyncStorage.setItem('rider_info', JSON.stringify(res.data.rider));
      navigation.replace('Home');
    } catch (err) {
      Alert.alert('Login Failed', err.response?.data?.message || 'Wrong phone or PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🛵</Text>
      <Text style={styles.title}>Souqly Rider</Text>
      <Text style={styles.subtitle}>Login to see your deliveries</Text>

      <TextInput style={styles.input} placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="4-Digit PIN" value={pin} onChangeText={setPin} keyboardType="number-pad" maxLength={4} secureTextEntry />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Login →</Text>}
      </TouchableOpacity>

      <Text style={styles.help}>Your shop manager gives you the PIN</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E', padding: 24, justifyContent: 'center' },
  icon: { fontSize: 60, textAlign: 'center', marginBottom: 16 },
  title: { color: 'white', fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: '#888', textAlign: 'center', marginBottom: 40, marginTop: 4 },
  input: { backgroundColor: '#2a2a3e', color: 'white', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 12 },
  button: { backgroundColor: '#FF6B35', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  help: { color: '#555', textAlign: 'center', marginTop: 20, fontSize: 13 },
});
