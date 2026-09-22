'use client';
import Sidebar from '../../../components/Sidebar';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

const empty = { code: '', type: 'percent', value: '', minOrderAmount: '', maxDiscount: '', usageLimit: '', expiresAt: '' };

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/coupons').then(r => setCoupons(r.data.coupons || [])).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api.post('/coupons', form);
      setCoupons(prev => [r.data.coupon, ...prev]);
      setForm(empty);
      setShowForm(false);
      toast.success('Coupon created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (coupon) => {
    try {
      const r = await api.put(`/coupons/${coupon._id}/toggle`);
      setCoupons(prev => prev.map(c => c._id === coupon._id ? { ...c, isActive: r.data.isActive } : c));
      toast.success(r.data.isActive ? 'Coupon enabled' : 'Coupon disabled');
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await api.delete(`/coupons/${id}`);
      setCoupons(prev => prev.filter(c => c._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  const isExpired = (c) => c.expiresAt && new Date() > new Date(c.expiresAt);

  return (
    <div className="min-h-screen flex" style={{ background: "#080808" }}><Sidebar /><div className="flex-1 overflow-auto" style={{ background: "#080808" }}>
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-primary">← Dashboard</Link>
          <span className="text-gray-300">/</span>
          <span className="font-bold text-gray-900">Coupons</span>
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90">
          + Create Coupon
        </button>
      </nav>

      <div className="p-6 max-w-3xl">

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">New Coupon</h2>
              <button onClick={() => { setShowForm(false); setForm(empty); }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Coupon Code *</label>
                  <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SAVE20" required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono font-bold uppercase focus:outline-none focus:ring-2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Discount Type *</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                    <option value="percent">Percentage (%) off</option>
                    <option value="flat">Flat (₹) off</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    {form.type === 'percent' ? 'Percentage (%)' : 'Amount (₹)'} *
                  </label>
                  <input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                    placeholder={form.type === 'percent' ? '10' : '50'} required min="1"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Min Order Amount (₹)</label>
                  <input type="number" value={form.minOrderAmount} onChange={e => setForm({ ...form, minOrderAmount: e.target.value })}
                    placeholder="0 = no minimum"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2" />
                </div>
                {form.type === 'percent' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Max Discount Cap (₹)</label>
                    <input type="number" value={form.maxDiscount} onChange={e => setForm({ ...form, maxDiscount: e.target.value })}
                      placeholder="0 = no cap"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Usage Limit</label>
                  <input type="number" value={form.usageLimit} onChange={e => setForm({ ...form, usageLimit: e.target.value })}
                    placeholder="0 = unlimited"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Expiry Date</label>
                  <input type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
                  {saving ? 'Creating...' : 'Create Coupon'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setForm(empty); }}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Coupons List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading coupons...</div>
        ) : coupons.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-5xl mb-3">🎟️</div>
            <div className="font-semibold text-gray-700">No coupons yet</div>
            <div className="text-sm text-gray-400 mt-1">Create your first coupon to attract customers</div>
            <button onClick={() => setShowForm(true)}
              className="mt-4 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
              + Create Coupon
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {coupons.map(coupon => (
              <div key={coupon._id} className={`bg-white rounded-2xl border p-5 ${!coupon.isActive || isExpired(coupon) ? 'opacity-60' : 'border-gray-100'}`}>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold font-mono text-lg text-gray-900 tracking-widest">{coupon.code}</span>
                      {isExpired(coupon) && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">Expired</span>}
                      {!isExpired(coupon) && !coupon.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Disabled</span>}
                      {!isExpired(coupon) && coupon.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600">Active</span>}
                    </div>
                    <div className="text-sm text-gray-600">
                      {coupon.type === 'percent' ? `${coupon.value}% off` : `₹${coupon.value} off`}
                      {coupon.minOrderAmount > 0 && ` · Min order ₹${coupon.minOrderAmount}`}
                      {coupon.maxDiscount > 0 && ` · Max ₹${coupon.maxDiscount}`}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Used {coupon.usedCount} times
                      {coupon.usageLimit > 0 && ` / ${coupon.usageLimit}`}
                      {coupon.expiresAt && ` · Expires ${new Date(coupon.expiresAt).toLocaleDateString('en-IN')}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggle(coupon)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${coupon.isActive ? 'border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-500' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                      {coupon.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => handleDelete(coupon._id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 text-red-500 hover:bg-red-50">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </div>
    </div>
  );
}