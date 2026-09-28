'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Sidebar from '../../../components/Sidebar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const CATEGORY_MAP = {
  'Vegetables': ['Leafy Greens', 'Root Vegetables', 'Gourds & Squash', 'Exotic Vegetables', 'Other'],
  'Fruits': ['Citrus', 'Tropical', 'Berries', 'Seasonal', 'Dry Fruits', 'Other'],
  'Dairy & Eggs': ['Milk', 'Curd & Paneer', 'Butter & Cheese', 'Eggs', 'Other'],
  'Meat & Seafood': ['Chicken', 'Mutton', 'Fish', 'Prawns & Seafood', 'Other'],
  'Staples & Grains': ['Rice', 'Wheat & Flour', 'Pulses & Lentils', 'Oils & Ghee', 'Sugar & Salt', 'Other'],
  'Snacks': ['Chips & Crisps', 'Biscuits & Cookies', 'Namkeen', 'Chocolates', 'Other'],
  'Beverages': ['Juices', 'Cold Drinks', 'Tea & Coffee', 'Water & Health Drinks', 'Other'],
  'Bakery': ['Bread & Buns', 'Cakes & Pastries', 'Rusk & Toast', 'Other'],
  'Frozen Foods': ['Frozen Vegetables', 'Ice Cream', 'Ready to Cook', 'Other'],
  'Personal Care': ['Skin Care', 'Hair Care', 'Oral Care', 'Other'],
  'Household': ['Cleaning', 'Laundry', 'Kitchen Essentials', 'Other'],
  'Baby & Kids': ['Baby Food', 'Diapers', 'Toys', 'Other'],
  'Other': ['General', 'Other'],
};
const ALL_CATEGORIES = Object.keys(CATEGORY_MAP);

// Empty form template
const emptyForm = {
  name: '', description: '', price: '', mrp: '',
  category: '', subcategory: '', unit: 'piece', stock: '100',
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
  const [customCategory, setCustomCategory] = useState('');
  const [customSubcategory, setCustomSubcategory] = useState('');
  const fileRef = useRef();
  const bulkFileRef = useRef();

  // Load products
  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      // Only pass category filter for actual category tabs (not status tabs)
      if (activeCategory !== 'all' && activeCategory !== 'Active' && activeCategory !== 'Hidden') {
        params.set('category', activeCategory);
      }

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

  // Client-side filter for Active/Hidden status tabs
  const displayedProducts = activeCategory === 'Active'
    ? products.filter(p => p.isAvailable)
    : activeCategory === 'Hidden'
    ? products.filter(p => !p.isAvailable)
    : products;

  useEffect(() => { fetchProducts(); }, [search, activeCategory]);

  // Open add modal
  const openAdd = () => {
    setEditProduct(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview('');
    setError('');
    setCustomCategory('');
    setCustomSubcategory('');
    setShowModal(true);
  };

  // Open edit modal
  const openEdit = (product) => {
    setEditProduct(product);
    const cat = product.category || '';
    const sub = product.subcategory || '';
    const isCustomCat = cat && !ALL_CATEGORIES.includes(cat);
    const isCustomSub = sub && cat && CATEGORY_MAP[cat] && !CATEGORY_MAP[cat].includes(sub);
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: String(product.price || ''),
      mrp: String(product.mrp || ''),
      category: isCustomCat ? '__custom__' : cat,
      subcategory: isCustomSub ? '__custom__' : sub,
      unit: product.unit || 'piece',
      stock: String(product.stock ?? 100),
      hsnCode: product.hsnCode || '',
      gstRate: String(product.gstRate || '0'),
      isAvailable: product.isAvailable,
    });
    setCustomCategory(isCustomCat ? cat : '');
    setCustomSubcategory(isCustomSub ? sub : '');
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
      // Resolve custom category/subcategory values before submit
      const resolvedForm = {
        ...form,
        category: form.category === '__custom__' ? customCategory.trim() : form.category,
        subcategory: form.subcategory === '__custom__' ? customSubcategory.trim() : form.subcategory,
      };

      // Use FormData to support image upload
      const fd = new FormData();
      Object.entries(resolvedForm).forEach(([k, v]) => fd.append(k, v));
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
    const a = document.createElement('a');
    a.href = `${API}/products/template`;
    a.download = 'souqly-products-template.xlsx';
    a.click();
  };

  const isLowStock = (p) => p.stock <= p.lowStockAlert;

  // Shared modal input/label styles
  const lbl = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 };
  const inp = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#111827', background: '#fff' };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', width: '100%' }}>

      <Sidebar />

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>

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
          <div style={{ margin: '12px 24px 0', padding: '10px 14px', borderRadius: 10, fontSize: 13,
            background: bulkResult.success ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${bulkResult.success ? '#bbf7d0' : '#fecaca'}`,
            color: bulkResult.success ? '#166534' : '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{bulkResult.success ? `✅ ${bulkResult.message}${bulkResult.skipped ? ` (${bulkResult.skipped} rows skipped)` : ''}` : `❌ ${bulkResult.message}`}</span>
            <button onClick={() => setBulkResult(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16 }}>✕</button>
          </div>
        )}

        {/* Tab bar + Search */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px' }}>
          {/* Status tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb' }}>
            {['All', 'Active', 'Hidden'].map(tab => (
              <button key={tab} onClick={() => setActiveCategory(tab === 'All' ? 'all' : tab)}
                style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, border: 'none', background: 'none', cursor: 'pointer',
                  borderBottom: (tab === 'All' ? activeCategory === 'all' : activeCategory === tab) ? '2px solid #111827' : '2px solid transparent',
                  color: (tab === 'All' ? activeCategory === 'all' : activeCategory === tab) ? '#111827' : '#6b7280' }}>
                {tab}
              </button>
            ))}
            {categories.filter(c => c !== 'Hidden').slice(0, 5).map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, border: 'none', background: 'none', cursor: 'pointer',
                  borderBottom: activeCategory === cat ? '2px solid #111827' : '2px solid transparent',
                  color: activeCategory === cat ? '#111827' : '#6b7280', whiteSpace: 'nowrap' }}>
                {cat}
              </button>
            ))}
          </div>

          {/* Search row */}
          <div style={{ padding: '10px 0', display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products"
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px 8px 34px',
                  fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#111827' }} />
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: '#9ca3af' }}>
              <div style={{ width: 32, height: 32, border: '3px solid #f97316', borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }}></div>
              Loading products...
            </div>
          ) : displayedProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>📦</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 6 }}>No products yet</div>
              <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 20 }}>Add your first product to start selling</div>
              <button onClick={openAdd} style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Add product
              </button>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginTop: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ width: 40, padding: '10px 12px' }}>
                      <input type="checkbox" style={{ cursor: 'pointer' }} />
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 }}>Product</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 }}>Status</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 }}>Inventory</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 }}>Price</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 }}>Category</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedProducts.map((product, i) => (
                    <tr key={product._id} style={{ borderBottom: i < displayedProducts.length - 1 ? '1px solid #f3f4f6' : 'none', background: '#fff' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                        <input type="checkbox" style={{ cursor: 'pointer' }} />
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', background: '#f3f4f6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {product.image
                              ? <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <span style={{ fontSize: 22 }}>📦</span>
                            }
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, color: '#111827' }}>{product.name}</div>
                            {product.subcategory && <div style={{ fontSize: 12, color: '#9ca3af' }}>{product.subcategory}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <button onClick={() => toggleAvailable(product)}
                          style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                            background: product.isAvailable ? '#dcfce7' : '#f3f4f6',
                            color: product.isAvailable ? '#16a34a' : '#6b7280' }}>
                          {product.isAvailable ? 'Active' : 'Hidden'}
                        </button>
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <button onClick={() => { setStockModal(product); setNewStock(String(product.stock)); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            color: isLowStock(product) ? '#dc2626' : '#374151', fontWeight: isLowStock(product) ? 600 : 400 }}>
                          {product.stock} {product.unit}
                          {isLowStock(product) && <span style={{ fontSize: 11, marginLeft: 4, color: '#dc2626' }}>⚠ Low</span>}
                        </button>
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ fontWeight: 500, color: '#111827' }}>₹{product.price}</div>
                        {product.mrp && product.mrp > product.price && (
                          <div style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'line-through' }}>₹{product.mrp}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 12px', color: '#6b7280' }}>{product.category || '—'}</td>
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(product)}
                            style={{ padding: '5px 12px', background: '#f3f4f6', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', color: '#374151' }}>
                            Edit
                          </button>
                          <button onClick={() => deleteProduct(product)}
                            style={{ padding: '5px 10px', background: '#fef2f2', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#dc2626' }}>
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #f3f4f6' }}>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: 17, color: '#111827' }}>
                {editProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={() => setShowModal(false)}
                style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#f3f4f6', cursor: 'pointer', fontSize: 16, color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Error */}
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
                  ⚠ {error}
                </div>
              )}

              {/* Image upload */}
              <div>
                <label style={lbl}>Product Image</label>
                <div onClick={() => fileRef.current.click()}
                  style={{ border: '2px dashed #e5e7eb', borderRadius: 12, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', background: '#fafafa' }}>
                  {imagePreview
                    ? <img src={imagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="preview" />
                    : <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 28, marginBottom: 4 }}>📷</div>
                        <p style={{ margin: 0, color: '#9ca3af', fontSize: 12 }}>Click to upload image</p>
                        <p style={{ margin: 0, color: '#d1d5db', fontSize: 11 }}>JPG, PNG, WebP · Max 5MB</p>
                      </div>
                  }
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
              </div>

              {/* Name */}
              <div>
                <label style={lbl}>Product Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="e.g. Fresh Tomatoes, Chicken Biryani"
                  style={inp} required />
              </div>

              {/* Description */}
              <div>
                <label style={lbl}>Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Short description (optional)"
                  style={{ ...inp, resize: 'vertical', minHeight: 64 }} rows={2} />
              </div>

              {/* Price + MRP */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Selling Price (₹) *</label>
                  <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                    placeholder="0" style={inp} required min="0" />
                </div>
                <div>
                  <label style={lbl}>MRP (₹) <span style={{ color: '#9ca3af', fontWeight: 400 }}>crossed out</span></label>
                  <input type="number" value={form.mrp} onChange={e => setForm({...form, mrp: e.target.value})}
                    placeholder="0" style={inp} min="0" />
                </div>
              </div>

              {/* Category + Subcategory */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Category</label>
                  <select value={form.category} onChange={e => { setForm({...form, category: e.target.value, subcategory: ''}); setCustomCategory(''); setCustomSubcategory(''); }} style={inp}>
                    <option value="">-- Select --</option>
                    {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__custom__">+ Custom...</option>
                  </select>
                  {form.category === '__custom__' && (
                    <input type="text" value={customCategory} onChange={e => setCustomCategory(e.target.value)}
                      placeholder="Type custom category"
                      style={{ ...inp, marginTop: 8, borderColor: '#f97316' }} />
                  )}
                </div>
                <div>
                  <label style={lbl}>Subcategory</label>
                  <select value={form.subcategory} onChange={e => { setForm({...form, subcategory: e.target.value}); setCustomSubcategory(''); }}
                    style={{ ...inp, opacity: !form.category ? 0.5 : 1 }} disabled={!form.category}>
                    <option value="">-- Select --</option>
                    {(form.category !== '__custom__' ? (CATEGORY_MAP[form.category] || []) : []).map(s => <option key={s} value={s}>{s}</option>)}
                    <option value="__custom__">+ Custom...</option>
                  </select>
                  {form.subcategory === '__custom__' && (
                    <input type="text" value={customSubcategory} onChange={e => setCustomSubcategory(e.target.value)}
                      placeholder="Type custom subcategory"
                      style={{ ...inp, marginTop: 8, borderColor: '#f97316' }} />
                  )}
                </div>
              </div>

              {/* Unit + Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Unit</label>
                  <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} style={inp}>
                    {['piece', 'kg', 'gram', 'litre', 'ml', 'dozen', 'box', 'pack', 'bottle'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Stock Quantity</label>
                  <input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})}
                    placeholder="100" style={inp} min="0" />
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>Use 999 for unlimited</p>
                </div>
              </div>

              {/* HSN + GST */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>HSN Code</label>
                  <input value={form.hsnCode} onChange={e => setForm({...form, hsnCode: e.target.value})}
                    placeholder="e.g. 0702" style={inp} />
                </div>
                <div>
                  <label style={lbl}>GST Rate (%)</label>
                  <select value={form.gstRate} onChange={e => setForm({...form, gstRate: e.target.value})} style={inp}>
                    {['0', '5', '12', '18', '28'].map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ flex: 1, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ flex: 1, border: 'none', background: '#f97316', color: '#fff', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : editProduct ? 'Save Changes' : 'Add Product'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* STOCK UPDATE MODAL */}
      {stockModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 320, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 16, color: '#111827' }}>Update Stock</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#9ca3af' }}>{stockModal.name}</p>
            <input
              type="number" value={newStock} onChange={e => setNewStock(e.target.value)}
              style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px', fontSize: 20, textAlign: 'center', fontWeight: 700, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
              min="0" autoFocus
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStockModal(null)}
                style={{ flex: 1, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', borderRadius: 10, padding: '10px', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={updateStock}
                style={{ flex: 1, border: 'none', background: '#f97316', color: '#fff', borderRadius: 10, padding: '10px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Update</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


