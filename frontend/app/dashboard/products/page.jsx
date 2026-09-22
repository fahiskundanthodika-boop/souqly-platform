'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Sidebar from '../../../components/Sidebar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Empty form template
const emptyForm = {
  name: '', description: '', price: '', mrp: '',
  category: '', unit: 'piece', stock: '100',
  hsnCode: '', gstRate: '0', isAvailable: true
};

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stockModal, setStockModal] = useState(null);
  const [newStock, setNewStock] = useState('');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const fileRef = useRef();
  const bulkFileRef = useRef();

  // Load products
  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (activeCategory !== 'all') params.set('category', activeCategory);

      const token = localStorage.getItem('ownerToken');
      const res = await fetch(`${API}/products?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
        if (data.categories?.length) setCategories(data.categories);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [search, activeCategory]);

  // Open add modal
  const openAdd = () => {
    setEditProduct(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview('');
    setError('');
    setShowModal(true);
  };

  // Open edit modal
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
      hsnCode: product.hsnCode || '',
      gstRate: String(product.gstRate || '0'),
      isAvailable: product.isAvailable,
    });
    setImageFile(null);
    setImagePreview(product.image || '');
    setError('');
    setShowModal(true);
  };

  // Handle image selection
  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // Submit add/edit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Product name is required'); return; }
    if (!form.price || isNaN(form.price)) { setError('Enter a valid price'); return; }

    setSaving(true);
    try {
      // Use FormData to support image upload
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append('image', imageFile);

      const url = editProduct ? `${API}/products/${editProduct._id}` : `${API}/products`;
      const method = editProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${localStorage.getItem('ownerToken')}` },
        body: fd, // No Content-Type header - browser sets it with boundary for FormData
      });

      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Save failed'); return; }

      setShowModal(false);
      fetchProducts();
    } catch (e) {
      setError('Could not save product. Try again.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle available/unavailable
  const toggleAvailable = async (product) => {
    try {
      await fetch(`${API}/products/${product._id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('ownerToken')}` },
      });
      fetchProducts();
    } catch (e) {}
  };

  // Delete product
  const deleteProduct = async (product) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await fetch(`${API}/products/${product._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('ownerToken')}` },
      });
      fetchProducts();
    } catch (e) {}
  };

  // Update stock
  const updateStock = async () => {
    if (!stockModal || newStock === '') return;
    try {
      await fetch(`${API}/products/${stockModal._id}/stock`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('ownerToken')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: Number(newStock) }),
      });
      setStockModal(null);
      fetchProducts();
    } catch (e) {}
  };

  // Bulk upload Excel/CSV
  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBulkUploading(true);
    setBulkResult(null);
    try {
      const token = localStorage.getItem('ownerToken');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API}/products/bulk-upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      setBulkResult(data);
      if (data.success) fetchProducts();
    } catch {
      setBulkResult({ success: false, message: 'Upload failed. Please try again.' });
    } finally {
      setBulkUploading(false);
      e.target.value = '';
    }
  };

  const downloadTemplate = () => {
    const token = localStorage.getItem('ownerToken');
    const a = document.createElement('a');
    a.href = `${API}/products/template`;
    a.click();
  };

  const isLowStock = (p) => p.stock <= p.lowStockAlert;

  return (
    <div className="min-h-screen bg-gray-50 flex">

      <Sidebar />

      {/* Main */}
      <div className="flex-1 flex flex-col">

        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Products</h1>
            <p className="text-gray-400 text-xs">{products.length} products total</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Download template */}
            <button onClick={downloadTemplate}
              className="border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors">
              📥 Excel Template
            </button>
            {/* Bulk upload */}
            <input ref={bulkFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleBulkUpload} />
            <button onClick={() => bulkFileRef.current?.click()} disabled={bulkUploading}
              className="border border-blue-200 text-blue-600 px-3 py-2 rounded-xl text-xs font-medium hover:bg-blue-50 transition-colors disabled:opacity-60">
              {bulkUploading ? '⏳ Uploading...' : '📤 Bulk Upload'}
            </button>
            {/* Add single */}
            <button onClick={openAdd}
              className="bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors flex items-center gap-2">
              <span className="text-lg leading-none">+</span> Add Product
            </button>
          </div>
        </div>

        {/* Bulk upload result */}
        {bulkResult && (
          <div className={`mx-6 mt-4 p-3 rounded-xl text-sm ${bulkResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {bulkResult.success
              ? `✅ ${bulkResult.message} ${bulkResult.skipped ? `(${bulkResult.skipped} rows skipped)` : ''}`
              : `❌ ${bulkResult.message}`}
            <button onClick={() => setBulkResult(null)} className="ml-3 text-gray-400 hover:text-gray-600">✕</button>
          </div>
        )}

        <div className="p-6">

          {/* Search + Category filters */}
          <div className="mb-5 space-y-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder=" Search products by name..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
            />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {['all', ...categories].map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    activeCategory === cat
                      ? 'bg-orange-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'
                  }`}>
                  {cat === 'all' ? 'All Products' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="text-center py-16 text-gray-400">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4"></div>
              <h3 className="font-bold text-gray-900 mb-2">No products yet</h3>
              <p className="text-gray-400 text-sm mb-6">Add your first product to start selling</p>
              <button onClick={openAdd} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-orange-600">
                + Add First Product
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {products.map(product => (
                <div key={product._id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">

                  {/* Image */}
                  <div className="relative bg-gray-50 h-36 flex items-center justify-center">
                    {product.image
                      ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      : <span className="text-4xl"></span>
                    }
                    {/* Low stock badge */}
                    {isLowStock(product) && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                        Low Stock
                      </span>
                    )}
                    {/* Hidden badge */}
                    {!product.isAvailable && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-black/60 px-2 py-1 rounded-lg">HIDDEN</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h3>
                    <p className="text-gray-400 text-xs truncate">{product.category || 'No category'}</p>

                    {/* Price */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="font-bold text-orange-500 text-sm">{product.price}</span>
                      {product.mrp && product.mrp > product.price && (
                        <span className="text-gray-400 line-through text-xs">{product.mrp}</span>
                      )}
                    </div>

                    {/* Stock */}
                    <button
                      onClick={() => { setStockModal(product); setNewStock(String(product.stock)); }}
                      className={`text-xs mt-1 px-2 py-0.5 rounded-full ${
                        isLowStock(product) ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'
                      } hover:bg-orange-50 hover:text-orange-600 transition-colors`}>
                      Stock: {product.stock} {product.unit}
                    </button>

                    {/* Toggle + Edit + Delete */}
                    <div className="flex items-center gap-1 mt-3">
                      {/* Available toggle */}
                      <button
                        onClick={() => toggleAvailable(product)}
                        title={product.isAvailable ? 'Click to hide' : 'Click to show'}
                        className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${
                          product.isAvailable
                            ? 'bg-green-50 text-green-600 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}>
                        {product.isAvailable ? '" Live' : ' Hidden'}
                      </button>
                      <button onClick={() => openEdit(product)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors" title="Edit">
                        
                      </button>
                      <button onClick={() => deleteProduct(product)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Delete">
                        
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* "" ADD / EDIT MODAL """"""""""""""""""""""""""""" */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">
                {editProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
                
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                   {error}
                </div>
              )}

              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
                <div
                  onClick={() => fileRef.current.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl h-32 flex items-center justify-center cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-colors overflow-hidden">
                  {imagePreview
                    ? <img src={imagePreview} className="w-full h-full object-cover" alt="preview" />
                    : (
                      <div className="text-center">
                        <div className="text-3xl mb-1"></div>
                        <p className="text-gray-400 text-xs">Click to upload image</p>
                        <p className="text-gray-300 text-xs">JPG, PNG, WebP  Max 5MB</p>
                      </div>
                    )
                  }
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="e.g. Fresh Tomatoes, Chicken Biryani"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                  required />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Short description of the product (optional)"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                  rows={2} />
              </div>

              {/* Price + MRP */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Selling Price () *</label>
                  <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                    required min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">MRP () <span className="text-gray-400 font-normal">crossed</span></label>
                  <input type="number" value={form.mrp} onChange={e => setForm({...form, mrp: e.target.value})}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                    min="0" />
                </div>
              </div>

              {/* Category + Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                  <input value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                    placeholder="e.g. Vegetables, Drinks"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit</label>
                  <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400">
                    {['piece', 'kg', 'gram', 'litre', 'ml', 'dozen', 'box', 'pack', 'bottle'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stock */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Stock Quantity</label>
                <input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})}
                  placeholder="100"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                  min="0" />
                <p className="text-xs text-gray-400 mt-1">Set to 999 if you have unlimited stock</p>
              </div>

              {/* GST */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">HSN Code</label>
                  <input value={form.hsnCode} onChange={e => setForm({...form, hsnCode: e.target.value})}
                    placeholder="e.g. 0702"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">GST Rate (%)</label>
                  <select value={form.gstRate} onChange={e => setForm({...form, gstRate: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400">
                    {['0', '5', '12', '18', '28'].map(r => (
                      <option key={r} value={r}>{r}%</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-60">
                  {saving ? 'Saving...' : editProduct ? 'Save Changes' : 'Add Product'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* "" STOCK UPDATE MODAL """"""""""""""""""""""""""" */}
      {stockModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xs p-6">
            <h3 className="font-bold text-gray-900 mb-1">Update Stock</h3>
            <p className="text-gray-400 text-sm mb-4">{stockModal.name}</p>
            <input
              type="number" value={newStock} onChange={e => setNewStock(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg text-center font-bold focus:outline-none focus:ring-2 focus:ring-orange-200 mb-4"
              min="0" autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setStockModal(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={updateStock}
                className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl text-sm font-semibold">Update</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


