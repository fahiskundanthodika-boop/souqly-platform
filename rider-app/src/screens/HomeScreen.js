import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Switch, Alert, Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function HomeScreen({ navigation }) {
  const [rider, setRider] = useState(null);
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);

  const load = useCallback(async () => {
    const riderData = await AsyncStorage.getItem('rider_info');
    if (riderData) setRider(JSON.parse(riderData));
    try {
      const res = await api.get('/riders/me/orders');
      setOrders(res.data.orders || []);
    } catch (e) {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const toggleOnline = async (val) => {
    setTogglingOnline(true);
    try {
      await api.put('/riders/me/status', { isOnline: val });
      setIsOnline(val);
    } catch (e) {
      Alert.alert('Error', 'Could not update status');
    } finally {
      setTogglingOnline(false);
    }
  };

  const logout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await AsyncStorage.clear();
        navigation.replace('Login');
      }},
    ]);
  };

  const openMaps = (address) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url);
  };

  const statusColor = (status) => {
    if (status === 'out_for_delivery') return '#FF6B35';
    if (status === 'confirmed') return '#3b82f6';
    if (status === 'packing') return '#f59e0b';
    return '#888';
  };

  const statusLabel = (status) => {
    if (status === 'out_for_delivery') return 'Out for Delivery';
    if (status === 'confirmed') return 'Confirmed';
    if (status === 'packing') return 'Packing';
    return status;
  };

  const renderOrder = ({ item: order }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Delivery', { order })}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderNum}>#{order.orderId}</Text>
        <View style={[styles.badge, { backgroundColor: statusColor(order.orderStatus) + '20' }]}>
          <Text style={[styles.badgeText, { color: statusColor(order.orderStatus) }]}>
            {statusLabel(order.orderStatus)}
          </Text>
        </View>
        <Text style={styles.amount}>₹{order.total}</Text>
      </View>

      <Text style={styles.customer}>👤 {order.customerName}</Text>
      <Text style={styles.phone}>📞 {order.customerPhone}</Text>
      <Text style={styles.address} numberOfLines={2}>📍 {order.customerAddress}</Text>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.mapsBtn} onPress={() => openMaps(order.customerAddress)}>
          <Text style={styles.mapsBtnText}>🗺️ Open in Maps</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.detailBtn} onPress={() => navigation.navigate('Delivery', { order })}>
          <Text style={styles.detailBtnText}>Details →</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={orders}
      keyExtractor={o => o._id}
      renderItem={renderOrder}
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
      ListHeaderComponent={
        <View>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.helloText}>Hello, {rider?.name || 'Rider'} 🛵</Text>
              <Text style={styles.subText}>{orders.length} active {orders.length === 1 ? 'delivery' : 'deliveries'}</Text>
            </View>
            <TouchableOpacity onPress={logout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Online Toggle */}
          <View style={styles.onlineCard}>
            <View>
              <Text style={styles.onlineLabel}>
                {isOnline ? '🟢 You are Online' : '🔴 You are Offline'}
              </Text>
              <Text style={styles.onlineSub}>
                {isOnline ? 'You can receive deliveries' : 'Toggle to start receiving'}
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={toggleOnline}
              disabled={togglingOnline}
              trackColor={{ false: '#ddd', true: '#FF6B35' }}
              thumbColor={isOnline ? 'white' : '#f4f3f4'}
            />
          </View>

          <Text style={styles.sectionTitle}>Your Deliveries</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyText}>No deliveries assigned yet</Text>
          <Text style={styles.emptyHint}>Pull down to refresh</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, gap: 12 },
  header: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 20, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  helloText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  subText: { color: '#888', marginTop: 4, fontSize: 13 },
  logoutText: { color: '#888', fontSize: 13 },
  onlineCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  onlineLabel: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  onlineSub: { fontSize: 12, color: '#888', marginTop: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#FF6B35', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderNum: { fontWeight: 'bold', fontSize: 15, color: '#1a1a2e' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  amount: { color: '#FF6B35', fontWeight: 'bold', fontSize: 15 },
  customer: { color: '#444', fontSize: 13, marginBottom: 3 },
  phone: { color: '#444', fontSize: 13, marginBottom: 3 },
  address: { color: '#666', fontSize: 13, marginBottom: 12 },
  cardActions: { flexDirection: 'row', gap: 8 },
  mapsBtn: { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 10, padding: 10, alignItems: 'center' },
  mapsBtnText: { color: 'white', fontWeight: '600', fontSize: 13 },
  detailBtn: { flex: 1, backgroundColor: '#FF6B3520', borderRadius: 10, padding: 10, alignItems: 'center' },
  detailBtnText: { color: '#FF6B35', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyText: { color: '#555', fontSize: 16, fontWeight: '600' },
  emptyHint: { color: '#aaa', fontSize: 13, marginTop: 6 },
});
