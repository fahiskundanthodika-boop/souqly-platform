import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Switch, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import api from '../services/api';

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Shop profile
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  // Delivery
  const [deliveryCharge, setDeliveryCharge] = useState('');
  const [freeDeliveryAbove, setFreeDeliveryAbove] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [maxDeliveryKm, setMaxDeliveryKm] = useState('');
  const [selfPickup, setSelfPickup] = useState(true);

  // Payment
  const [codEnabled, setCodEnabled] = useState(true);
  const [onlineEnabled, setOnlineEnabled] = useState(false);
  const [upiId, setUpiId] = useState('');

  // Store status
  const [isActive, setIsActive] = useState(true);

  const load = async () => {
    try {
      const res = await api.get('/shop/my');
      const s = res.data.shop;
      setShopName(s.name || '');
      setOwnerName(s.ownerName || '');
      setPhone(s.phone || '');
      setWhatsapp(s.whatsappNumber || '');
      setAddress(s.address || '');
      setCity(s.city || '');
      setGstNumber(s.gstNumber || '');
      setDeliveryCharge(String(s.deliveryCharge ?? 40));
      setFreeDeliveryAbove(String(s.freeDeliveryAbove ?? 500));
      setMinOrderAmount(String(s.minOrderAmount ?? 0));
      setMaxDeliveryKm(String(s.maxDeliveryKm ?? 10));
      setSelfPickup(s.deliveryOptions?.selfPickupEnabled ?? true);
      setCodEnabled(s.paymentOptions?.codEnabled ?? true);
      setOnlineEnabled(s.paymentOptions?.onlineEnabled ?? false);
      setUpiId(s.paymentOptions?.upiId || '');
      setIsActive(s.isActive ?? true);
    } catch (e) {
      Alert.alert('Error', 'Could not load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/shop/settings', {
        name: shopName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        whatsappNumber: whatsapp.trim(),
        address: address.trim(),
        city: city.trim(),
        gstNumber: gstNumber.trim(),
        deliveryCharge: Number(deliveryCharge) || 0,
        freeDeliveryAbove: Number(freeDeliveryAbove) || 0,
        minOrderAmount: Number(minOrderAmount) || 0,
        maxDeliveryKm: Number(maxDeliveryKm) || 10,
        isActive,
        'deliveryOptions.selfPickupEnabled': selfPickup,
        'paymentOptions.codEnabled': codEnabled,
        'paymentOptions.onlineEnabled': onlineEnabled,
        'paymentOptions.upiId': upiId.trim(),
      });
      Alert.alert('Saved!', 'Your settings have been updated.');
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
    >
      {/* Store Status */}
      <Section title="Store Status">
        <Row label="Store is Open" value={isActive} onToggle={setIsActive} isSwitch />
      </Section>

      {/* Shop Profile */}
      <Section title="Shop Profile">
        <Field label="Shop Name" value={shopName} onChange={setShopName} placeholder="e.g. Fresh Mart" />
        <Field label="Owner Name" value={ownerName} onChange={setOwnerName} placeholder="Your name" />
        <Field label="Phone" value={phone} onChange={setPhone} placeholder="+91 9876543210" keyboard="phone-pad" />
        <Field label="WhatsApp Number" value={whatsapp} onChange={setWhatsapp} placeholder="+91 9876543210" keyboard="phone-pad" />
        <Field label="Address" value={address} onChange={setAddress} placeholder="Shop address" multiline />
        <Field label="City" value={city} onChange={setCity} placeholder="Kochi" />
        <Field label="GST Number" value={gstNumber} onChange={setGstNumber} placeholder="29ABCDE1234F1Z5" autoCapitalize="characters" />
      </Section>

      {/* Delivery Settings */}
      <Section title="Delivery Settings">
        <Field label="Delivery Charge (₹)" value={deliveryCharge} onChange={setDeliveryCharge} keyboard="numeric" placeholder="40" />
        <Field label="Free Delivery Above (₹)" value={freeDeliveryAbove} onChange={setFreeDeliveryAbove} keyboard="numeric" placeholder="500" />
        <Field label="Minimum Order (₹)" value={minOrderAmount} onChange={setMinOrderAmount} keyboard="numeric" placeholder="0" />
        <Field label="Max Delivery Distance (km)" value={maxDeliveryKm} onChange={setMaxDeliveryKm} keyboard="numeric" placeholder="10" />
        <Row label="Self Pickup Enabled" value={selfPickup} onToggle={setSelfPickup} isSwitch />
      </Section>

      {/* Payment Settings */}
      <Section title="Payment Settings">
        <Row label="Cash on Delivery" value={codEnabled} onToggle={setCodEnabled} isSwitch />
        <Row label="Online Payment" value={onlineEnabled} onToggle={setOnlineEnabled} isSwitch />
        <Field label="UPI ID" value={upiId} onChange={setUpiId} placeholder="yourname@upi" keyboard="email-address" />
      </Section>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
        {saving
          ? <ActivityIndicator color="white" />
          : <Text style={styles.saveBtnText}>Save Settings</Text>
        }
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, keyboard = 'default', multiline = false, autoCapitalize = 'sentences' }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#bbb"
        keyboardType={keyboard}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

function Row({ label, value, onToggle, isSwitch }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#ddd', true: '#FF6B35' }}
        thumbColor={value ? 'white' : '#f4f3f4'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#FF6B35', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  card: { backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  field: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  fieldLabel: { fontSize: 12, color: '#888', marginBottom: 4, fontWeight: '500' },
  input: { fontSize: 15, color: '#1a1a2e', paddingVertical: 0 },
  inputMultiline: { height: 64, textAlignVertical: 'top' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowLabel: { fontSize: 15, color: '#1a1a2e' },
  saveBtn: { margin: 16, marginTop: 24, backgroundColor: '#FF6B35', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
