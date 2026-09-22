'use client';
import Sidebar from '../../../components/Sidebar';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [inventoryBranch, setInventoryBranch] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const emptyForm = { branchName: '', branchCode: '', address: '', city: '', managerName: '', managerPhone: '', deliveryRadius: 5 };
  const [form, setForm] = useState(emptyForm);

  const token = typeof window !== 'undefined' ? localStorage.getItem('ownerToken') : null;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => { fetchBranches(); }, []);

  async function fetchBranches() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/shop/branches`, { headers });
      const d = await r.json();
      if (d.success) setBranches(d.branches);
    } finally { setLoading(false); }
  }

  function openAdd() { setEditing(null); setForm(emptyForm); setShowForm(true); }
  function openEdit(b) { setEditing(b._id); setForm({ branchName: b.branchName, branchCode: b.branchCode || '', address: b.address || '', city: b.city || '', managerName: b.managerName || '', managerPhone: b.managerPhone || '', deliveryRadius: b.deliveryRadius || 5 }); setShowForm(true); }

  async function submitForm(e) {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      const url = editing ? `${API}/shop/branches/${editing}` : `${API}/shop/branches`;
      const method = editing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers, body: JSON.stringify(form) });
      const d = await r.json();
      if (d.success) { setMsg(d.message); setShowForm(false); fetchBranches(); }
      else setMsg(d.message);
    } finally { setSaving(false); }
  }

  async function deleteBranch(id, name) {
    if (!confirm(`Delete branch "${name}"? This cannot be undone.`)) return;
    const r = await fetch(`${API}/shop/branches/${id}`, { method: 'DELETE', headers });
    const d = await r.json();
    if (d.success) { setMsg(d.message); fetchBranches(); }
    else setMsg(d.message);
  }

  async function openInventory(b) {
    setInventoryBranch(b);
    setInventoryLoading(true);
    try {
      const r = await fetch(`${API}/shop/branches/${b._id}/inventory`, { headers });
      const d = await r.json();
      if (d.success) setInventory(d.inventory.map(i => ({ ...i, _dirty: false })));
    } finally { setInventoryLoading(false); }
  }

  function updateStock(productId, field, value) {
    setInventory(prev => prev.map(i => i.productId.toString() === productId.toString() ? { ...i, [field]: value, _dirty: true } : i));
  }

  async function saveInventory() {
    setSaving(true); setMsg('');
    try {
      const items = inventory.filter(i => i._dirty).map(i => ({ productId: i.productId, stock: i.stock, lowStockAlert: i.lowStockAlert }));
      if (items.length === 0) { setMsg('No changes to save.'); setSaving(false); return; }
      const r = await fetch(`${API}/shop/branches/${inventoryBranch._id}/inventory`, { method: 'PUT', headers, body: JSON.stringify({ items }) });
      const d = await r.json();
      setMsg(d.message);
      if (d.success) setInventory(prev => prev.map(i => ({ ...i, _dirty: false })));
    } finally { setSaving(false); }
  }

  // ── Inventory view ──────────────────────────────────────────────
  if (inventoryBranch) {
    return (
    <div className="min-h-screen bg-gray-50 flex"><Sidebar /><div className="flex-1 overflow-auto p-6">
        <button onClick={() => { setInventoryBranch(null); setInventory([]); }} style={{ background: 'none', border: 'none', color: '#FF6B35', cursor: 'pointer', fontSize: 14, marginBottom: 16 }}>
          ← Back to Branches
        </button>
        <h2 style={{ margin: '0 0 4px' }}>Inventory — {inventoryBranch.branchName}</h2>
        <p style={{ color: '#666', marginBottom: 20 }}>{inventoryBranch.city || inventoryBranch.address}</p>

        {msg && <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: 16, color: '#16a34a' }}>{msg}</div>}

        {inventoryLoading ? <p>Loading inventory...</p> : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={th}>Product</th>
                    <th style={th}>Price</th>
                    <th style={th}>Stock (units)</th>
                    <th style={th}>Low Stock Alert</th>
                    <th style={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map(item => (
                    <tr key={item.productId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {item.image && <img src={item.image} alt={item.name} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />}
                          <span style={{ fontWeight: 500 }}>{item.name}</span>
                        </div>
                      </td>
                      <td style={td}>₹{item.price}</td>
                      <td style={td}>
                        <input type="number" min="0" value={item.stock} onChange={e => updateStock(item.productId, 'stock', e.target.value)}
                          style={{ width: 80, padding: '4px 8px', border: '1px solid #e0e0e0', borderRadius: 6 }} />
                      </td>
                      <td style={td}>
                        <input type="number" min="0" value={item.lowStockAlert} onChange={e => updateStock(item.productId, 'lowStockAlert', e.target.value)}
                          style={{ width: 80, padding: '4px 8px', border: '1px solid #e0e0e0', borderRadius: 6 }} />
                      </td>
                      <td style={td}>
                        {item.stock === 0 ? <span style={{ color: '#dc2626', fontWeight: 600 }}>Out of Stock</span>
                          : item.stock <= item.lowStockAlert ? <span style={{ color: '#d97706', fontWeight: 600 }}>Low Stock</span>
                          : <span style={{ color: '#16a34a' }}>In Stock</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={saveInventory} disabled={saving}
              style={{ marginTop: 20, background: '#FF6B35', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, cursor: 'pointer' }}>
              {saving ? 'Saving...' : 'Save Inventory'}
            </button>
          </>
        )}
      </div></div>
    );
  }

  // ── Branches list ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex"><Sidebar /><div className="flex-1 overflow-auto" style={{ padding: '24px', maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>Branches</h1>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: 14 }}>Manage your store locations and their stock</p>
        </div>
        <button onClick={openAdd}
          style={{ background: '#FF6B35', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>
          + Add Branch
        </button>
      </div>

      {msg && <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: 16, color: '#16a34a' }}>{msg}</div>}

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 20px' }}>{editing ? 'Edit Branch' : 'New Branch'}</h3>
          <form onSubmit={submitForm}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Branch Name *', key: 'branchName', required: true, placeholder: 'e.g. Main Branch' },
                { label: 'Branch Code', key: 'branchCode', placeholder: 'e.g. MBR' },
                { label: 'Address', key: 'address', placeholder: 'Street address' },
                { label: 'City', key: 'city', placeholder: 'City' },
                { label: 'Manager Name', key: 'managerName', placeholder: 'Manager name' },
                { label: 'Manager Phone', key: 'managerPhone', placeholder: '9876543210' },
                { label: 'Delivery Radius (km)', key: 'deliveryRadius', type: 'number' },
              ].map(f => (
                <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>{f.label}</label>
                  <input
                    type={f.type || 'text'}
                    required={f.required}
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14 }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button type="submit" disabled={saving}
                style={{ background: '#FF6B35', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, cursor: 'pointer' }}>
                {saving ? 'Saving...' : editing ? 'Update Branch' : 'Add Branch'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                style={{ background: '#f5f5f5', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Branches grid */}
      {loading ? <p>Loading branches...</p> : branches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
          <p style={{ fontWeight: 600, fontSize: 18, margin: '0 0 6px', color: '#555' }}>No branches yet</p>
          <p style={{ margin: 0 }}>Add your first branch to manage multiple locations.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {branches.map(b => (
            <div key={b._id} style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>{b.branchName}</h3>
                  {b.branchCode && <span style={{ fontSize: 12, color: '#FF6B35', fontWeight: 600 }}>{b.branchCode}</span>}
                </div>
                <span style={{ background: b.isActive ? '#dcfce7' : '#fee2e2', color: b.isActive ? '#16a34a' : '#dc2626', fontSize: 12, padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                  {b.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {b.city && <p style={{ margin: '0 0 4px', fontSize: 13, color: '#666' }}>📍 {b.city}{b.address ? `, ${b.address}` : ''}</p>}
              {b.managerName && <p style={{ margin: '0 0 4px', fontSize: 13, color: '#666' }}>👤 {b.managerName}{b.managerPhone ? ` · ${b.managerPhone}` : ''}</p>}
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#666' }}>🚚 {b.deliveryRadius} km delivery radius</p>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openInventory(b)}
                  style={{ flex: 1, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  📦 Inventory
                </button>
                <button onClick={() => openEdit(b)}
                  style={{ background: '#f5f5f5', border: 'none', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 13 }}>
                  Edit
                </button>
                <button onClick={() => deleteBranch(b._id, b.branchName)}
                  style={{ background: '#fff0f0', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 13 }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div></div>
  );
}

const th = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#555', borderBottom: '1px solid #e0e0e0' };
const td = { padding: '10px 14px' };
