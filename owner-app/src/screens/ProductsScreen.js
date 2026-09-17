import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  Switch, Modal, TextInput, ScrollView, Alert, ActivityIndicator, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';

const emptyForm = { name: '', description: '', price: '', mrp: '', category: '', unit: 'piece', stock: '100' };

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageUri, setImageUri] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data.products || []);
    } catch (e) {}
  };

  useEffect(() => { fetchProducts(); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchProducts(); setRefreshing(false); };

  const openAdd = () => {
    setEditProduct(null);
    setForm(emptyForm);
    setImageUri(null);
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditProduct(product);
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: String(product.price || ''),
      mrp: String(product.mrp || ''),
      category: product.category || '',
      unit: product.unit || 'piece',
      stock: String(product.stock ?? 100),
    });
    setImageUri(product.image || null);
    setShowModal(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to your photos to upload product images.'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access to take product photos.'); return; }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const showImageOptions = () => {
    Alert.alert('Product Image', 'Choose a source', [
      { text: '📷 Camera', onPress: takePhoto },
      { text: '🖼️ Gallery', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Product name is required'); return; }
    if (!form.price || isNaN(form.price)) { Alert.alert('Error', 'Enter a valid price'); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));

      // Attach image if it's a local file (not a URL already on Cloudinary)
      if (imageUri && imageUri.startsWith('file')) {
        const filename = imageUri.split('/').pop();
        const ext = filename.split('.').pop().toLowerCase();
        fd.append('image', { uri: imageUri, name: filename, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
      }

      const url = editProduct ? `/products/${editProduct._id}` : '/products';
      const method = editProduct ? 'put' : 'post';

      await api[method](url, fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      setShowModal(false);
      fetchProducts();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not save product.');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = (product) => {
    Alert.alert('Delete Product', `Delete "${product.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api.delete(`/products/${product._id}`);
        fetchProducts();
      }},
    ]);
  };

  const toggleAvailability = async (product) => {
    await api.patch(`/products/${product._id}/toggle`);
    fetchProducts();
  };

  const renderProduct = ({ item: p }) => (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => openEdit(p)} style={styles.cardImageWrap}>
        {p.image
          ? <Image source={{ uri: p.image }} style={styles.cardImage} />
          : <Text style={styles.cardImagePlaceholder}>🛍️</Text>
        }
      </TouchableOpacity>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{p.name}</Text>
        <Text style={styles.cardCat} numberOfLines={1}>{p.category || 'No category'}</Text>
        <Text style={styles.cardPrice}>₹{p.price}
          {p.mrp && p.mrp > p.price ? <Text style={styles.cardMrp}> ₹{p.mrp}</Text> : null}
        </Text>
        <Text style={styles.cardStock}>Stock: {p.stock}</Text>
      </View>
      <View style={styles.cardActions}>
        <Switch
          value={p.isAvailable}
          onValueChange={() => toggleAvailability(p)}
          trackColor={{ false: '#ddd', true: '#FF6B35' }}
          thumbColor="white"
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
        <TouchableOpacity onPress={() => openEdit(p)} style={styles.editBtn}>
          <Text style={{ fontSize: 14 }}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteProduct(p)} style={styles.deleteBtn}>
          <Text style={{ fontSize: 14 }}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={products}
        keyExtractor={p => p._id}
        renderItem={renderProduct}
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
        ListHeaderComponent={
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Add Product</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🛍️</Text>
            <Text style={styles.emptyText}>No products yet</Text>
            <Text style={styles.emptyHint}>Tap "Add Product" to get started</Text>
          </View>
        }
      />

      {/* Add / Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowModal(false)}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{editProduct ? 'Edit Product' : 'Add Product'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#FF6B35" /> : <Text style={styles.modalSave}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">

          {/* Image Picker */}
          <TouchableOpacity style={styles.imagePicker} onPress={showImageOptions}>
            {imageUri
              ? <Image source={{ uri: imageUri }} style={styles.imagePickerImg} />
              : <View style={styles.imagePickerPlaceholder}>
                  <Text style={{ fontSize: 36 }}>📷</Text>
                  <Text style={styles.imagePickerHint}>Tap to add photo</Text>
                </View>
            }
          </TouchableOpacity>

          <Field label="Product Name *" value={form.name} onChange={v => setForm({...form, name: v})} placeholder="e.g. Fresh Tomatoes" />
          <Field label="Description" value={form.description} onChange={v => setForm({...form, description: v})} placeholder="Optional description" multiline />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Field label="Selling Price (₹) *" value={form.price} onChange={v => setForm({...form, price: v})} placeholder="0" keyboard="numeric" />
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <Field label="MRP (₹)" value={form.mrp} onChange={v => setForm({...form, mrp: v})} placeholder="0" keyboard="numeric" />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Field label="Category" value={form.category} onChange={v => setForm({...form, category: v})} placeholder="e.g. Vegetables" />
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <Field label="Stock" value={form.stock} onChange={v => setForm({...form, stock: v})} placeholder="100" keyboard="numeric" />
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, keyboard = 'default', multiline = false }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && { height: 72, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#bbb"
        keyboardType={keyboard}
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 14, gap: 10 },
  addBtn: { backgroundColor: '#FF6B35', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 6 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  card: { backgroundColor: 'white', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardImageWrap: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardImage: { width: 56, height: 56 },
  cardImagePlaceholder: { fontSize: 28 },
  cardInfo: { flex: 1 },
  cardName: { fontWeight: 'bold', color: '#1a1a2e', fontSize: 14 },
  cardCat: { color: '#888', fontSize: 11, marginTop: 1 },
  cardPrice: { color: '#FF6B35', fontWeight: '700', fontSize: 13, marginTop: 3 },
  cardMrp: { color: '#bbb', fontSize: 11, textDecorationLine: 'line-through', fontWeight: 'normal' },
  cardStock: { color: '#aaa', fontSize: 11, marginTop: 1 },
  cardActions: { alignItems: 'center', gap: 6 },
  editBtn: { padding: 4 },
  deleteBtn: { padding: 4 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontWeight: 'bold', color: '#555', fontSize: 16 },
  emptyHint: { color: '#aaa', fontSize: 13, marginTop: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: 'white' },
  modalCancel: { color: '#888', fontSize: 15 },
  modalTitle: { fontWeight: 'bold', fontSize: 16, color: '#1a1a2e' },
  modalSave: { color: '#FF6B35', fontWeight: 'bold', fontSize: 15 },
  modalBody: { flex: 1, backgroundColor: '#f8f9fa', padding: 16 },
  imagePicker: { backgroundColor: 'white', borderRadius: 16, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 14, overflow: 'hidden', borderWidth: 2, borderStyle: 'dashed', borderColor: '#e0e0e0' },
  imagePickerImg: { width: '100%', height: '100%' },
  imagePickerPlaceholder: { alignItems: 'center' },
  imagePickerHint: { color: '#aaa', fontSize: 13, marginTop: 6 },
  field: { backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 10 },
  fieldLabel: { fontSize: 11, color: '#888', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { fontSize: 15, color: '#1a1a2e', padding: 0 },
  row: { flexDirection: 'row' },
});
