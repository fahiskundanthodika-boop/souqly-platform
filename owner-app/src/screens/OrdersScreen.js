// Owner App - Real-time Orders Screen
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl, Platform
} from 'react-native';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const SOCKET_URL = api.defaults.baseURL.replace('/api', '');

const STATUS_COLORS = {
  new:              { bg: '#dbeafe', text: '#1d4ed8' },
  confirmed:        { bg: '#fef9c3', text: '#854d0e' },
  packing:          { bg: '#ffedd5', text: '#9a3412' },
  out_for_delivery: { bg: '#ede9fe', text: '#6b21a8' },
  delivered:        { bg: '#dcfce7', text: '#166534' },
  cancelled:        { bg: '#fee2e2', text: '#b91c1c' }
};
const STATUS_LABELS = {
  new: 'New', confirmed: 'Confirmed', packing: 'Packing',
  out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled'
};
const PAYMENT_LABELS = {
  cod: '💵 Cash', card_on_delivery: '💳 Card',
  pickup: '🏪 Pickup', bank_transfer: '🏦 Bank', online: '🌐 Online'
};
const TABS = ['new', 'confirmed', 'packing', 'out_for_delivery', 'delivered'];

export default function OrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('new');
  const [refreshing, setRefreshing] = useState(false);
  const [newIds, setNewIds] = useState(new Set());
  const socketRef = useRef(null);

  const fetchOrders = useCallback(async (status) => {
    try {
      const res = await api.get(`/orders?status=${status}&limit=50`);
      setOrders(res.data.orders || []);
    } catch (e) {}
  }, []);

  useEffect(() => { fetchOrders(tab); }, [tab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders(tab);
    setRefreshing(false);
  };

  // Socket.io real-time
  useEffect(() => {
    let socket;
    (async () => {
      const shopRaw = await AsyncStorage.getItem('owner_shop');
      const shop = shopRaw ? JSON.parse(shopRaw) : {};

      socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        if (shop._id) socket.emit('join_shop', shop._id);
      });

      socket.on('new_order', (newOrder) => {
        // Add to top if we're on new tab
        setOrders(prev => {
          if (newOrder.orderStatus !== 'new') return prev;
          const exists = prev.some(o => o._id === newOrder._id);
          return exists ? prev : [newOrder, ...prev];
        });
        // Flash highlight
        setNewIds(prev => new Set([...prev, newOrder._id]));
        setTimeout(() => {
          setNewIds(prev => {
            const next = new Set(prev);
            next.delete(newOrder._id);
            return next;
          });
        }, 5000);
      });

      socket.on('order_status_update', ({ orderId, orderStatus }) => {
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, orderStatus } : o));
      });
    })();

    return () => { if (socket) socket.disconnect(); };
  }, []);

  const updateStatus = (orderId, status) => {
    const label = STATUS_LABELS[status] || status;
    Alert.alert('Update Order', `Mark as "${label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm', style: 'default', onPress: async () => {
          try {
            await api.put(`/orders/${orderId}/status`, { orderStatus: status });
            setOrders(prev => prev.map(o => o._id === orderId ? { ...o, orderStatus: status } : o));
          } catch (e) {
            Alert.alert('Error', 'Could not update order');
          }
        }
      }
    ]);
  };

  const rejectOrder = (orderId) => {
    Alert.alert('Reject Order', 'Why are you rejecting this order?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Out of Stock', onPress: () => updateStatus(orderId, 'cancelled') },
      { text: 'Shop Closed', onPress: () => updateStatus(orderId, 'cancelled') },
      { text: 'Other Reason', onPress: () => updateStatus(orderId, 'cancelled') },
    ]);
  };

  const visibleOrders = orders.filter(o => o.orderStatus === tab);
  const newCount = orders.filter(o => o.orderStatus === 'new').length;

  const renderOrder = ({ item: order }) => {
    const sc = STATUS_COLORS[order.orderStatus] || STATUS_COLORS.new;
    const isNew = newIds.has(order._id);

    return (
      <View style={[styles.card, isNew && styles.cardNew]}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={styles.orderNum}>#{order.orderId}</Text>
              <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                <Text style={[styles.badgeText, { color: sc.text }]}>
                  {STATUS_LABELS[order.orderStatus]}
                </Text>
              </View>
              {isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW ✨</Text>
                </View>
              )}
            </View>
            <Text style={styles.customerName}>{order.customerName}</Text>
            <Text style={styles.customerPhone}>{order.customerPhone}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.total}>₹{order.total}</Text>
            <Text style={styles.payBadge}>{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</Text>
          </View>
        </View>

        {/* Address */}
        {order.customerAddress ? (
          <Text style={styles.address} numberOfLines={2}>📍 {order.customerAddress}</Text>
        ) : null}

        {/* Items summary */}
        <Text style={styles.itemsSummary}>
          {order.items?.map(i => `${i.name} ×${i.qty}`).join(', ')}
        </Text>

        {/* Notes */}
        {order.notes ? (
          <Text style={styles.notes}>📝 {order.notes}</Text>
        ) : null}

        {/* Action buttons */}
        <View style={styles.actions}>
          {order.orderStatus === 'new' && (
            <>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => updateStatus(order._id, 'confirmed')}>
                <Text style={styles.actionBtnText}>✓ Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectOrder(order._id)}>
                <Text style={styles.actionBtnText}>✗ Reject</Text>
              </TouchableOpacity>
            </>
          )}
          {order.orderStatus === 'confirmed' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f97316' }]}
              onPress={() => updateStatus(order._id, 'packing')}>
              <Text style={styles.actionBtnText}>📦 Start Packing</Text>
            </TouchableOpacity>
          )}
          {order.orderStatus === 'packing' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#a855f7' }]}
              onPress={() => updateStatus(order._id, 'out_for_delivery')}>
              <Text style={styles.actionBtnText}>🛵 Send for Delivery</Text>
            </TouchableOpacity>
          )}
          {order.orderStatus === 'out_for_delivery' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#22c55e' }]}
              onPress={() => updateStatus(order._id, 'delivered')}>
              <Text style={styles.actionBtnText}>✅ Mark Delivered</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>

      {/* Status tabs */}
      <FlatList
        horizontal
        data={TABS}
        keyExtractor={s => s}
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={{ paddingHorizontal: 8 }}
        renderItem={({ item: s }) => {
          const count = orders.filter(o => o.orderStatus === s).length;
          const isActive = tab === s;
          return (
            <TouchableOpacity
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setTab(s)}>
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {STATUS_LABELS[s]}
                {count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Orders list */}
      <FlatList
        data={visibleOrders}
        keyExtractor={o => o._id}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{tab === 'new' ? '📭' : '📋'}</Text>
            <Text style={styles.emptyTitle}>
              {tab === 'new' ? 'No new orders' : `No ${STATUS_LABELS[tab].toLowerCase()} orders`}
            </Text>
            {tab === 'new' && (
              <Text style={styles.emptySubtitle}>New orders appear here instantly</Text>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  tabBar: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', maxHeight: 52, flexGrow: 0 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#FF6B35' },
  tabText: { fontSize: 13, fontWeight: '500', color: '#9ca3af' },
  tabTextActive: { color: '#FF6B35', fontWeight: '700' },
  list: { padding: 12, gap: 10 },
  card: {
    backgroundColor: 'white', borderRadius: 16, padding: 14,
    borderWidth: 1.5, borderColor: '#f3f4f6',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 2 } })
  },
  cardNew: { borderColor: '#FF6B35', backgroundColor: '#fff9f7' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderNum: { fontSize: 18, fontWeight: '800', color: '#FF6B35', marginBottom: 3 },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  newBadge: { backgroundColor: '#fff3e0', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  newBadgeText: { fontSize: 11, fontWeight: '700', color: '#FF6B35' },
  customerName: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginTop: 2 },
  customerPhone: { fontSize: 13, color: '#9ca3af', marginTop: 1 },
  total: { fontSize: 17, fontWeight: '800', color: '#1a1a2e' },
  payBadge: { fontSize: 11, color: '#9ca3af', marginTop: 3 },
  address: { fontSize: 12, color: '#6b7280', marginBottom: 6, lineHeight: 16 },
  itemsSummary: { fontSize: 12, color: '#9ca3af', marginBottom: 6 },
  notes: { fontSize: 12, color: '#92400e', backgroundColor: '#fef3c7', borderRadius: 8, padding: 8, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  acceptBtn: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: '#22c55e' },
  rejectBtn: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: '#ef4444' },
  actionBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6b7280' },
  emptySubtitle: { fontSize: 13, color: '#9ca3af', marginTop: 6 },
});
