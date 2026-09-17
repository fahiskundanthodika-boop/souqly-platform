// Owner App Home - dashboard summary
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';

export default function HomeScreen() {
  const [shop, setShop] = useState(null);
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const load = async () => {
    const shopData = await AsyncStorage.getItem('owner_shop');
    if (shopData) setShop(JSON.parse(shopData));
    try {
      const res = await api.get('/analytics/summary');
      setStats(res.data.data);
    } catch (e) {}
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const logout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await AsyncStorage.clear();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }},
    ]);
  };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {shop?.name} 👋</Text>
          <Text style={styles.plan}>Plan: {shop?.plan?.toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        {[
          { label: "Today's Orders", value: stats?.todayOrders || 0, icon: '📦' },
          { label: "Today's Revenue", value: `₹${stats?.todayRevenue || 0}`, icon: '💰' },
          { label: 'Pending', value: stats?.pendingOrders || 0, icon: '⏳' },
          { label: 'Customers', value: stats?.totalCustomers || 0, icon: '👥' },
        ].map((card, i) => (
          <View key={i} style={styles.statCard}>
            <Text style={styles.statIcon}>{card.icon}</Text>
            <Text style={styles.statValue}>{card.value}</Text>
            <Text style={styles.statLabel}>{card.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.tip}>💡 Pull down to refresh</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FF6B35' },
  greeting: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  plan: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  logout: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  statCard: { width: '46%', backgroundColor: 'white', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statIcon: { fontSize: 28, marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 4, textAlign: 'center' },
  tip: { textAlign: 'center', color: '#ccc', fontSize: 12, marginTop: 8, paddingBottom: 24 },
});
