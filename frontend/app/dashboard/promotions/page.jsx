'use client';
import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../../components/Sidebar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const CATEGORY_LIST = [
  'Vegetables','Fruits','Dairy & Eggs','Meat & Seafood','Staples & Grains',
  'Snacks','Beverages','Bakery','Frozen Foods','Personal Care','Household','Baby & Kids','Other'
];

const STATUS_STYLE = {
  active:    { bg: '#dcfce7', color: '#166534', dot: '#22c55e', label: '🟢 LIVE' },
  scheduled: { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6', label: '🔵 UPCOMING' },
  paused:    { bg: '#fef9c3', color: '#854d0e', dot: '#eab308', label: '⏸ PAUSED' },
  ended:     { bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af', label: '⚫ ENDED' },
};

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

// ─── 3-step Create/Edit Modal ─────────────────────────────────────────────────
function PromoModal({ products, categories, editing, onSave, onClose }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const empty = {
    name: '', bannerText: '',
    startDate: today, endDate: tomorrow, autoExpire: true,
    target: { type: 'all', category: '', productIds: [] },
    discount: { type: 'percent', value: 10, buyQty: 2, getQty: 1 },
  };

  const [form, setForm] = useState(editing ? {
    name: editing.name,
    bannerText: editing.bannerText || '',
    startDate: editing.startDate?.slice(0, 10) || today,
    endDate: editing.endDate?.slice(0, 10) || tomorrow,
    autoExpire: editing.autoExpire !== false,
    target: editing.target || { type: 'all', category: '', productIds: [] },
    discount: editing.discount || { type: 'percent', value: 10, buyQty: 2, getQty: 1 },
  } : empty);

  const sf = (patch) => setForm(f => ({ ...f, ...patch }));
  const st = (patch) => setForm(f => ({ ...f, target: { ...f.target, ...patch } }));
  const sd = (patch) => setForm(f => ({ ...f, discount: { ...f.discount, ...patch } }));

  const toggleProduct = (id) => {
    const ids = form.target.productIds || [];
    st({ productIds: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] });
  };

  // Live preview price
  const samplePrice = 100;
  let previewSale = samplePrice;
  if (form.discount.type === 'percent') previewSale = samplePrice * (1 - form.discount.value / 100);
  else if (form.discount.type === 'flat') previewSale = Math.max(0, samplePrice - form.discount.value);
  const saved = samplePrice - previewSale;

  async function handleSave() {
    if (!form.name) { setError('Promotion name is required'); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem('ownerToken');
      const url = editing ? `${API}/promotions/${editing._id}` : `${API}/promotions`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || 'Save failed'); setSaving(false); return; }
      onSave();
    } catch (e) {
      setError('Could not save. Try again.');
      setSaving(false);
    }
  }

  const inp = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#111827', background: '#fff' };
  const lbl = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#111827' }}>{editing ? 'Edit Promotion' : 'Create Promotion'}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Step {step} of 3</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#f3f4f6', cursor: 'pointer', fontSize: 16, color: '#6b7280' }}>✕</button>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', padding: '12px 20px', gap: 6, borderBottom: '1px solid #f3f4f6' }}>
          {[['1', 'Basic Info'], ['2', 'Target'], ['3', 'Discount']].map(([n, label]) => (
            <div key={n} onClick={() => step > parseInt(n) && setStep(parseInt(n))}
              style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, cursor: step > parseInt(n) ? 'pointer' : 'default' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                background: step >= parseInt(n) ? '#f97316' : '#f3f4f6',
                color: step >= parseInt(n) ? '#fff' : '#9ca3af' }}>{n}</div>
              <span style={{ fontSize: 12, fontWeight: step === parseInt(n) ? 600 : 400, color: step === parseInt(n) ? '#111827' : '#9ca3af' }}>{label}</span>
              {parseInt(n) < 3 && <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />}
            </div>
          ))}
        </div>

        <div style={{ padding: 20 }}>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>⚠ {error}</div>}

          {/* ─── STEP 1: Basic Info ─── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Promotion Name *</label>
                <input value={form.name} onChange={e => sf({ name: e.target.value })} placeholder="e.g. Weekend Sale, Diwali Offers" style={inp} />
              </div>
              <div>
                <label style={lbl}>Banner Text <span style={{ color: '#9ca3af', fontWeight: 400 }}>(shown on store banner)</span></label>
                <input value={form.bannerText} onChange={e => sf({ bannerText: e.target.value })} placeholder="e.g. 🎉 Flat 50% OFF this weekend!" style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => sf({ startDate: e.target.value })} style={inp} />
                </div>
                <div>
                  <label style={lbl}>End Date</label>
                  <input type="date" value={form.endDate} onChange={e => sf({ endDate: e.target.value })} style={inp} />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#374151', padding: '10px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <input type="checkbox" checked={form.autoExpire} onChange={e => sf({ autoExpire: e.target.checked })} style={{ width: 16, height: 16 }} />
                <div>
                  <div style={{ fontWeight: 600 }}>Auto-expire when end date passes</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>Prices restore automatically — no manual action needed</div>
                </div>
              </label>
            </div>
          )}

          {/* ─── STEP 2: Target ─── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={lbl}>Who does this promotion apply to?</label>
              {[
                { value: 'all', icon: '🏪', title: 'All Products', desc: 'Every product in your store gets the discount' },
                { value: 'category', icon: '📂', title: 'By Category', desc: 'All products in a specific category' },
                { value: 'products', icon: '📦', title: 'Selected Products', desc: 'Hand-pick specific products' },
              ].map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: `2px solid ${form.target.type === opt.value ? '#f97316' : '#e5e7eb'}`, background: form.target.type === opt.value ? '#fff7ed' : '#fff', cursor: 'pointer' }}>
                  <input type="radio" name="target" value={opt.value} checked={form.target.type === opt.value} onChange={() => st({ type: opt.value })} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 22 }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{opt.title}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}

              {form.target.type === 'category' && (
                <div style={{ marginTop: 4 }}>
                  <label style={lbl}>Select Category</label>
                  <select value={form.target.category} onChange={e => st({ category: e.target.value })} style={inp}>
                    <option value="">-- Select --</option>
                    {CATEGORY_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {form.target.type === 'products' && (
                <div style={{ marginTop: 4 }}>
                  <label style={lbl}>Select Products ({form.target.productIds?.length || 0} selected)</label>
                  <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    {products.map(p => (
                      <label key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
                        background: form.target.productIds?.includes(p._id) ? '#fff7ed' : '#fff' }}>
                        <input type="checkbox" checked={form.target.productIds?.includes(p._id) || false} onChange={() => toggleProduct(p._id)} />
                        {p.image && <img src={p.image} alt={p.name} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: '#9ca3af' }}>₹{p.price} · {p.category}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 3: Discount ─── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Discount Type</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { value: 'percent', icon: '%', title: 'Percentage Off', desc: 'e.g. 50% off original price' },
                    { value: 'flat',    icon: '₹', title: 'Flat ₹ Off',    desc: 'e.g. ₹50 off every item' },
                    { value: 'bogo',    icon: '🎁', title: 'Buy X Get Y',  desc: 'e.g. Buy 2 Get 1 Free' },
                  ].map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: `2px solid ${form.discount.type === opt.value ? '#f97316' : '#e5e7eb'}`, background: form.discount.type === opt.value ? '#fff7ed' : '#fff', cursor: 'pointer' }}>
                      <input type="radio" name="dtype" value={opt.value} checked={form.discount.type === opt.value} onChange={() => sd({ type: opt.value })} />
                      <span style={{ fontSize: 20, width: 28, textAlign: 'center', fontWeight: 700, color: '#f97316' }}>{opt.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{opt.title}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {form.discount.type === 'percent' && (
                <div>
                  <label style={lbl}>Discount Percentage</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="range" min="1" max="90" value={form.discount.value} onChange={e => sd({ value: parseInt(e.target.value) })} style={{ flex: 1 }} />
                    <span style={{ fontWeight: 700, fontSize: 20, color: '#f97316', minWidth: 50, textAlign: 'right' }}>{form.discount.value}%</span>
                  </div>
                </div>
              )}

              {form.discount.type === 'flat' && (
                <div>
                  <label style={lbl}>Flat Discount Amount (₹)</label>
                  <input type="number" value={form.discount.value} onChange={e => sd({ value: parseFloat(e.target.value) || 0 })} placeholder="50" style={inp} min="1" />
                </div>
              )}

              {form.discount.type === 'bogo' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Buy Quantity</label>
                    <input type="number" value={form.discount.buyQty} onChange={e => sd({ buyQty: parseInt(e.target.value) || 1 })} style={inp} min="1" />
                  </div>
                  <div>
                    <label style={lbl}>Get Quantity Free</label>
                    <input type="number" value={form.discount.getQty} onChange={e => sd({ getQty: parseInt(e.target.value) || 1 })} style={inp} min="1" />
                  </div>
                </div>
              )}

              {/* Live Preview */}
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase' }}>Live Preview (sample ₹100 item)</div>
                {form.discount.type === 'bogo' ? (
                  <div style={{ fontSize: 14, color: '#111827' }}>
                    Buy <strong>{form.discount.buyQty}</strong> get <strong>{form.discount.getQty}</strong> free 🎁
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 18, textDecoration: 'line-through', color: '#9ca3af' }}>₹{samplePrice}</span>
                    <span style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>₹{previewSale.toFixed(0)}</span>
                    <span style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: 700, fontSize: 12, padding: '3px 8px', borderRadius: 20 }}>
                      {form.discount.type === 'percent' ? `${form.discount.value}% OFF` : `₹${saved.toFixed(0)} OFF`}
                    </span>
                  </div>
                )}
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>Customer saves ₹{form.discount.type === 'bogo' ? '—' : saved.toFixed(0)} per item · Original price never changed in DB</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 10 }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              ← Back
            </button>
          )}
          {step < 3 ? (
            <button onClick={() => { setError(''); setStep(s => s + 1); }} style={{ flex: 2, border: 'none', background: '#f97316', color: '#fff', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Next →
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving} style={{ flex: 2, border: 'none', background: saving ? '#f3f4f6' : '#f97316', color: saving ? '#9ca3af' : '#fff', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving...' : editing ? '💾 Save Changes' : '🚀 Launch Promotion'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PromotionsPage() {
  const [promos, setPromos] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('ownerToken') : '';
  const headers = { Authorization: `Bearer ${token}` };

  const fetchPromos = useCallback(async () => {
    try {
      const r = await fetch(`${API}/promotions`, { headers });
      const d = await r.json();
      if (d.success) setPromos(d.promotions);
    } catch (e) {}
    setLoading(false);
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const r = await fetch(`${API}/products`, { headers });
      const d = await r.json();
      if (d.success) setProducts(d.products || []);
    } catch (e) {}
  }, []);

  useEffect(() => { fetchPromos(); fetchProducts(); }, []);

  async function togglePause(id) {
    await fetch(`${API}/promotions/${id}/pause`, { method: 'PATCH', headers });
    fetchPromos();
  }

  async function deletePromo(id) {
    if (!confirm('Delete this promotion?')) return;
    await fetch(`${API}/promotions/${id}`, { method: 'DELETE', headers });
    fetchPromos();
  }

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const statusGroups = { active: [], scheduled: [], paused: [], ended: [] };
  promos.forEach(p => { (statusGroups[p.liveStatus] || statusGroups.ended).push(p); });
  const sorted = [...statusGroups.active, ...statusGroups.scheduled, ...statusGroups.paused, ...statusGroups.ended];

  function discountLabel(d) {
    if (!d) return '—';
    if (d.type === 'percent') return `${d.value}% OFF`;
    if (d.type === 'flat')    return `₹${d.value} OFF`;
    if (d.type === 'bogo')    return `Buy ${d.buyQty} Get ${d.getQty} Free`;
    return '—';
  }

  function targetLabel(t) {
    if (!t) return '—';
    if (t.type === 'all')      return '🏪 All Products';
    if (t.type === 'category') return `📂 ${t.category}`;
    if (t.type === 'products') return `📦 ${t.productIds?.length || 0} products`;
    return '—';
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', width: '100%' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>

        {/* Header */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontWeight: 700, fontSize: 22, color: '#111827' }}>Promotions</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>Discount rules — prices restore automatically when promotion ends</p>
          </div>
          <button onClick={() => { setEditing(null); setShowModal(true); }}
            style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            + Create Promotion
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Active', count: statusGroups.active.length, color: '#22c55e', bg: '#dcfce7' },
              { label: 'Upcoming', count: statusGroups.scheduled.length, color: '#3b82f6', bg: '#dbeafe' },
              { label: 'Paused', count: statusGroups.paused.length, color: '#eab308', bg: '#fef9c3' },
              { label: 'Ended', count: statusGroups.ended.length, color: '#9ca3af', bg: '#f3f4f6' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: s.color }}>{s.count}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>Loading promotions...</div>
          ) : sorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🏷️</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 6 }}>No promotions yet</div>
              <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 20 }}>Create your first sale or discount campaign</div>
              <button onClick={() => { setEditing(null); setShowModal(true); }}
                style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                + Create Promotion
              </button>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {['Promotion', 'Status', 'Target', 'Discount', 'Period', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((promo, i) => {
                    const s = STATUS_STYLE[promo.liveStatus] || STATUS_STYLE.ended;
                    return (
                      <tr key={promo._id} style={{ borderBottom: i < sorted.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{promo.name}</div>
                          {promo.bannerText && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{promo.bannerText}</div>}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>
                            {s.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#374151' }}>{targetLabel(promo.target)}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontWeight: 700, color: '#f97316' }}>{discountLabel(promo.discount)}</span>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: 12 }}>
                          <div>{fmtDate(promo.startDate)}</div>
                          <div>→ {fmtDate(promo.endDate)}</div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => { setEditing(promo); setShowModal(true); }}
                              style={{ padding: '5px 12px', background: '#f3f4f6', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', color: '#374151' }}>
                              Edit
                            </button>
                            <button onClick={() => togglePause(promo._id)}
                              style={{ padding: '5px 10px', background: promo.liveStatus === 'paused' ? '#dcfce7' : '#fef9c3', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: promo.liveStatus === 'paused' ? '#166534' : '#854d0e' }}>
                              {promo.liveStatus === 'paused' ? '▶' : '⏸'}
                            </button>
                            <button onClick={() => deletePromo(promo._id)}
                              style={{ padding: '5px 10px', background: '#fef2f2', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#dc2626' }}>
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <PromoModal
          products={products}
          categories={categories}
          editing={editing}
          onSave={() => { setShowModal(false); fetchPromos(); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
