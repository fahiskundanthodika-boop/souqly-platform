import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Linking, ActivityIndicator } from 'react-native';
import api from '../services/api';

export default function DeliveryScreen({ route, navigation }) {
  const { order } = route.params;
  const [loading, setLoading] = useState(false);

  const markDelivered = () => {
    Alert.alert('Confirm Delivery', `Mark Order #${order.orderId} as delivered?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: '✅ Yes, Delivered!', onPress: async () => {
        setLoading(true);
        try {
          await api.put(`/riders/me/order/${order._id}/deliver`);
          Alert.alert('Done!', 'Order marked as delivered!', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        } catch (e) {
          Alert.alert('Error', e?.response?.data?.message || 'Failed to update status');
        } finally {
          setLoading(false);
        }
      }},
    ]);
  };

  const callCustomer = () => Linking.openURL(`tel:${order.customerPhone}`);

  const whatsappCustomer = () => {
    const phone = order.customerPhone?.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hi ${order.customerName}, I'm your Souqly delivery rider. I'll be arriving soon with your order #${order.orderId}.`);
    Linking.openURL(`https://wa.me/${phone}?text=${msg}`);
  };

  const openMaps = () => {
    if (order.customerLocation?.lat && order.customerLocation?.lng) {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${order.customerLocation.lat},${order.customerLocation.lng}`);
    } else {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customerAddress)}`);
    }
  };

  const paymentBadge = order.paymentMethod === 'cod'
    ? { label: 'Collect Cash', color: '#ef4444' }
    : { label: 'Paid Online', color: '#22c55e' };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Order Header */}
      <View style={styles.card}>
        <Text style={styles.label}>ORDER NUMBER</Text>
        <Text style={styles.orderNum}>#{order.orderId}</Text>
        <View style={styles.row}>
          <Text style={styles.amount}>₹{order.total}</Text>
          <View style={[styles.payBadge, { backgroundColor: paymentBadge.color + '20' }]}>
            <Text style={[styles.payBadgeText, { color: paymentBadge.color }]}>{paymentBadge.label}</Text>
          </View>
        </View>
      </View>

      {/* Customer */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Customer</Text>
        <Text style={styles.info}>👤 {order.customerName}</Text>
        <Text style={styles.info}>📍 {order.customerAddress}</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#1A1A2E' }]} onPress={callCustomer}>
            <Text style={styles.actionBtnText}>📞 Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#25D366' }]} onPress={whatsappCustomer}>
            <Text style={styles.actionBtnText}>💬 WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4285f4' }]} onPress={openMaps}>
            <Text style={styles.actionBtnText}>🗺️ Maps</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Items */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Items ({order.items?.length})</Text>
        {order.items?.map((item, i) => (
          <View key={i} style={styles.item}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemQty}>× {item.qty}  <Text style={styles.itemPrice}>₹{item.total}</Text></Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.item}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{order.total}</Text>
        </View>
      </View>

      {order.notes ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer Note</Text>
          <Text style={styles.noteText}>"{order.notes}"</Text>
        </View>
      ) : null}

      {/* Deliver Button */}
      <TouchableOpacity style={styles.deliverBtn} onPress={markDelivered} disabled={loading}>
        {loading
          ? <ActivityIndicator color="white" />
          : <Text style={styles.deliverText}>✅ Mark as Delivered</Text>
        }
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  label: { color: '#888', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  orderNum: { fontSize: 28, fontWeight: 'bold', color: '#1a1a2e' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  amount: { color: '#FF6B35', fontWeight: 'bold', fontSize: 18 },
  payBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  payBadgeText: { fontWeight: '700', fontSize: 12 },
  sectionTitle: { fontWeight: 'bold', color: '#1a1a2e', marginBottom: 12, fontSize: 15 },
  info: { color: '#444', fontSize: 14, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  actionBtnText: { color: 'white', fontWeight: '600', fontSize: 12 },
  item: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  itemName: { color: '#444', fontSize: 14, flex: 1 },
  itemQty: { color: '#888', fontSize: 13 },
  itemPrice: { color: '#1a1a2e', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 4 },
  totalLabel: { fontWeight: 'bold', color: '#1a1a2e', fontSize: 15 },
  totalValue: { fontWeight: 'bold', color: '#FF6B35', fontSize: 15 },
  noteText: { color: '#666', fontStyle: 'italic', fontSize: 14 },
  deliverBtn: { backgroundColor: '#22c55e', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 8 },
  deliverText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
