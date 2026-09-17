'use client';
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const PLANS = ['free', 'growth', 'business'];
const PLAN_COLORS = {
  free: 'bg-gray-100 text-gray-600',
  growth: 'bg-orange-100 text-orange-700',
  business: 'bg-purple-100 text-purple-700'
};

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [shops, setShops] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedShop, setSelectedShop] = useState(null);
  const [tab, setTab] = useState('overview'); // 'overview' | 'shops'

  const loadStats = () => api.get('/admin/stats').then(r => setStats(r.data.stats)).catch(() => {});

  const loadShops = () => {
    const params = new URLSearchParams({ page, limit: 15 });
    if (search) params.set('search', search);
    if (filterPlan) params.set('plan', filterPlan);
    if (filterStatus) params.set('status', filterStatus);
    api.get(`/admin/shops?${params}`).then(r => {
      setShops(r.data.shops || []);
      setTotal(r.data.total || 0);
    }).catch(() => toast.error('Access denied. Super admin only.'));
  };

  useEffect(() => {
    Promise.all([loadStats(), loadShops()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadShops(); }, [search, filterPlan, filterStatus, page]);

  const handleSuspend = async (shop) => {
    if (!confirm(`${shop.isActive ? 'Suspend' : 'Activate'} ${shop.name}?`)) return;
    try {
      const r = await api.put(`/admin/shops/${shop._id}/suspend`);
      toast.success(r.data.message);
      setShops(prev => prev.map(s => s._id === shop._id ? { ...s, isActive: !s.isActive } : s));
      if (selectedShop?._id === shop._id) setSelectedShop(s => ({ ...s, isActive: !s.isActive }));
    } catch { toast.error('Failed'); }
  };

  const handlePlanChange = async (shopId, plan) => {
    try {
      await api.put(`/admin/shops/${shopId}/plan`, { plan });
      toast.success(`Plan updated to ${plan}`);
      setShops(prev => prev.map(s => s._id === shopId ? { ...s, plan } : s));
      if (selectedShop?._id === shopId) setSelectedShop(s => ({ ...s, plan }));
    } catch { toast.error('Failed'); }
  };

  const openShop = async (shop) => {
    try {
      const r = await api.get(`/admin/shops/${shop._id}`);
      setSelectedShop({ ...r.data.shop, orderCount: r.data.orderCount, customerCount: r.data.customerCount, revenue: r.data.revenue });
    } catch { setSelectedShop(shop); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading admin dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Souqly Super Admin</h1>
            <p className="text-xs text-gray-400">FaizeCart Online Services OPC Pvt Ltd · GSTIN: 32AAFCF7417G1ZU</p>
          </div>
        </div>
        <div className="flex gap-2">
          {['overview', 'shops'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t === 'overview' ? '📊 Overview' : '🏪 Shops'}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ── OVERVIEW TAB ─────────────────────────────────── */}
        {tab === 'overview' && stats && (
          <div className="space-y-6">

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Shops', value: stats.totalShops, icon: '🏪', color: 'text-blue-600' },
                { label: 'Active Shops', value: stats.activeShops, icon: '✅', color: 'text-green-600' },
                { label: 'Total Orders', value: stats.totalOrders.toLocaleString(), icon: '📦', color: 'text-orange-600' },
                { label: 'Platform Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: '💰', color: 'text-purple-600' },
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="text-3xl mb-2">{c.icon}</div>
                  <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                  <div className="text-xs text-gray-400 mt-1">{c.label}</div>
                </div>
              ))}
            </div>

            {/* Secondary stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="text-sm font-semibold text-gray-500 mb-3">Plan Breakdown</div>
                {stats.planBreakdown.map(p => (
                  <div key={p._id} className="flex items-center justify-between mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${PLAN_COLORS[p._id] || 'bg-gray-100 text-gray-600'}`}>{p._id}</span>
                    <span className="font-bold text-gray-900">{p.count} shops</span>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="text-sm font-semibold text-gray-500 mb-3">Suspended</div>
                <div className="text-3xl font-bold text-red-500">{stats.suspendedShops}</div>
                <div className="text-xs text-gray-400 mt-1">shops suspended</div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="text-sm font-semibold text-gray-500 mb-3">Total Customers</div>
                <div className="text-3xl font-bold text-blue-600">{stats.totalCustomers.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-1">across all shops</div>
              </div>
            </div>

            {/* Last 7 days activity */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="font-bold text-gray-900 mb-4">Last 7 Days Activity</div>
              {stats.last7Days.length === 0 ? (
                <div className="text-center py-6 text-gray-400">No orders in the last 7 days</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b">
                        <th className="pb-2 pr-6">Date</th>
                        <th className="pb-2 pr-6">Orders</th>
                        <th className="pb-2">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {stats.last7Days.map(d => (
                        <tr key={d._id}>
                          <td className="py-2 pr-6 text-gray-600">{d._id}</td>
                          <td className="py-2 pr-6 font-medium text-gray-900">{d.orders}</td>
                          <td className="py-2 font-bold text-primary">₹{d.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SHOPS TAB ────────────────────────────────────── */}
        {tab === 'shops' && (
          <div className="flex gap-6">

            {/* Shop List */}
            <div className={`${selectedShop ? 'w-1/2' : 'w-full'} space-y-4`}>

              {/* Filters */}
              <div className="flex gap-3 flex-wrap">
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search shops, owners, emails..."
                  className="flex-1 min-w-48 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                />
                <select value={filterPlan} onChange={e => { setFilterPlan(e.target.value); setPage(1); }}
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                  <option value="">All Plans</option>
                  {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="text-xs text-gray-400">{total} shops found</div>

              {/* Shop Cards */}
              <div className="space-y-2">
                {shops.map(shop => (
                  <div key={shop._id}
                    onClick={() => openShop(shop)}
                    className={`bg-white rounded-2xl border cursor-pointer hover:border-primary transition-colors p-4 ${selectedShop?._id === shop._id ? 'border-primary' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
                        {shop.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-sm truncate">{shop.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[shop.plan]}`}>{shop.plan}</span>
                        </div>
                        <div className="text-xs text-gray-400">{shop.ownerName} · {shop.city} · {shop.email}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-xs font-medium ${shop.isActive ? 'text-green-600' : 'text-red-500'}`}>
                          {shop.isActive ? '● Active' : '● Suspended'}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{shop.totalOrders} orders</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {total > 15 && (
                <div className="flex gap-2 justify-center pt-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-4 py-2 rounded-xl border text-sm disabled:opacity-40">← Prev</button>
                  <span className="px-4 py-2 text-sm text-gray-500">Page {page}</span>
                  <button onClick={() => setPage(p => p + 1)} disabled={page * 15 >= total}
                    className="px-4 py-2 rounded-xl border text-sm disabled:opacity-40">Next →</button>
                </div>
              )}
            </div>

            {/* Shop Detail Panel */}
            {selectedShop && (
              <div className="w-1/2 bg-white rounded-2xl border border-gray-100 p-6 h-fit sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900 text-lg">{selectedShop.name}</h2>
                  <button onClick={() => setSelectedShop(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: 'Orders', value: selectedShop.orderCount ?? selectedShop.totalOrders },
                      { label: 'Customers', value: selectedShop.customerCount ?? '—' },
                      { label: 'Revenue', value: `₹${(selectedShop.revenue ?? selectedShop.totalRevenue ?? 0).toLocaleString()}` }
                    ].map((s, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="font-bold text-gray-900">{s.value}</div>
                        <div className="text-xs text-gray-400">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {[
                    ['Owner', selectedShop.ownerName],
                    ['Email', selectedShop.email],
                    ['Phone', selectedShop.phone],
                    ['City', selectedShop.city],
                    ['Category', selectedShop.category],
                    ['Slug', selectedShop.slug],
                    ['Joined', new Date(selectedShop.createdAt).toLocaleDateString('en-IN')],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between border-b border-gray-50 pb-2">
                      <span className="text-gray-400">{label}</span>
                      <span className="font-medium text-gray-900">{value}</span>
                    </div>
                  ))}

                  {/* Plan change */}
                  <div className="pt-2">
                    <div className="text-gray-400 mb-2">Change Plan</div>
                    <div className="flex gap-2">
                      {PLANS.map(p => (
                        <button key={p} onClick={() => handlePlanChange(selectedShop._id, p)}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-colors capitalize ${selectedShop.plan === p ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary'}`}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Suspend / Activate */}
                  <button onClick={() => handleSuspend(selectedShop)}
                    className={`w-full py-3 rounded-xl font-semibold text-sm mt-2 transition-colors ${selectedShop.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                    {selectedShop.isActive ? '🚫 Suspend Shop' : '✅ Activate Shop'}
                  </button>

                  <a href={`/store/${selectedShop.slug}`} target="_blank"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:border-primary hover:text-primary transition-colors">
                    🔗 View Store
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
