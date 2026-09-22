'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const PLANS = ['free', 'starter', 'growth', 'business'];
const PLAN_BADGE = {
  free:     'bg-gray-100 text-gray-600',
  starter:  'bg-blue-100 text-blue-700',
  growth:   'bg-orange-100 text-orange-700',
  business: 'bg-purple-100 text-purple-700'
};
const primary = '#FF6B35';

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  return (
    <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-semibold flex items-center gap-2 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      {type === 'error' ? '❌' : '✅'} {msg}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">×</button>
    </div>
  );
}

// Minimal bar chart using SVG
function BarChart({ data, xKey, yKey, label }) {
  if (!data || data.length === 0) return <div className="text-center py-10 text-gray-400 text-sm">No data</div>;
  const max = Math.max(...data.map(d => d[yKey]), 1);
  const W = 600, H = 140, pad = 30, barW = Math.max(8, (W - pad * 2) / data.length - 4);
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" preserveAspectRatio="none">
      {data.map((d, i) => {
        const bh = Math.max(2, ((d[yKey] / max) * H));
        const x = pad + i * ((W - pad * 2) / data.length);
        const y = H - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} rx={3} fill={primary} opacity={0.8} />
            {data.length <= 10 && (
              <text x={x + barW / 2} y={H + 16} textAnchor="middle" fontSize="9" fill="#9ca3af">
                {d[xKey]?.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [stats, setStats] = useState(null);
  const [shops, setShops] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedShop, setSelectedShop] = useState(null);
  const [tab, setTab] = useState('overview');
  const [toast, setToast] = useState(null);
  const [chartView, setChartView] = useState('orders'); // 'orders' | 'revenue'
  const [confirmDelete, setConfirmDelete] = useState(null);

  function showToast(msg, type = 'success') { setToast({ msg, type }); }

  // Auth check on mount
  useEffect(() => {
    const t = localStorage.getItem('ownerToken');
    if (!t) { router.push('/admin/login'); return; }
    setToken(t);
  }, []);

  function authHeaders(t) {
    return { Authorization: `Bearer ${t || token}`, 'Content-Type': 'application/json' };
  }

  const loadStats = useCallback(async (t) => {
    try {
      const res = await fetch(`${API}/admin/stats`, { headers: authHeaders(t) });
      if (res.status === 401 || res.status === 403) { router.push('/admin/login'); return; }
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch {}
  }, [token]);

  const loadShops = useCallback(async (t) => {
    setShopsLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      if (filterPlan) params.set('plan', filterPlan);
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`${API}/admin/shops?${params}`, { headers: authHeaders(t) });
      const data = await res.json();
      if (data.success) { setShops(data.shops || []); setTotal(data.total || 0); }
    } catch {} finally { setShopsLoading(false); }
  }, [token, search, filterPlan, filterStatus, page]);

  useEffect(() => {
    if (!token) return;
    Promise.all([loadStats(token), loadShops(token)]).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadShops(token);
  }, [search, filterPlan, filterStatus, page]);

  async function handleSuspend(shop) {
    if (!confirm(`${shop.isActive ? 'Suspend' : 'Activate'} ${shop.name}?`)) return;
    try {
      const res = await fetch(`${API}/admin/shops/${shop._id}/suspend`, { method: 'PUT', headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setShops(prev => prev.map(s => s._id === shop._id ? { ...s, isActive: !s.isActive } : s));
        if (selectedShop?._id === shop._id) setSelectedShop(s => ({ ...s, isActive: !s.isActive }));
      }
    } catch { showToast('Failed', 'error'); }
  }

  async function handlePlanChange(shopId, plan) {
    try {
      const res = await fetch(`${API}/admin/shops/${shopId}/plan`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify({ plan })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Plan updated to ${plan}`);
        setShops(prev => prev.map(s => s._id === shopId ? { ...s, plan } : s));
        if (selectedShop?._id === shopId) setSelectedShop(s => ({ ...s, plan }));
      }
    } catch { showToast('Failed', 'error'); }
  }

  async function handleDelete(shop) {
    try {
      const res = await fetch(`${API}/admin/shops/${shop._id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setShops(prev => prev.filter(s => s._id !== shop._id));
        setSelectedShop(null);
        setConfirmDelete(null);
        setTotal(t => t - 1);
      } else { showToast(data.message, 'error'); }
    } catch { showToast('Failed', 'error'); }
  }

  async function handleImpersonate(shop) {
    try {
      const res = await fetch(`${API}/admin/shops/${shop._id}/impersonate`, { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        const url = `/dashboard?impersonate=1&token=${data.token}`;
        window.open(url, '_blank');
      }
    } catch { showToast('Failed', 'error'); }
  }

  async function openShop(shop) {
    try {
      const res = await fetch(`${API}/admin/shops/${shop._id}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setSelectedShop({ ...data.shop, orderCount: data.orderCount, customerCount: data.customerCount, revenue: data.revenue, recentOrders: data.recentOrders });
      }
    } catch { setSelectedShop(shop); }
  }

  function logout() {
    localStorage.removeItem('ownerToken');
    localStorage.removeItem('ownerShop');
    router.push('/admin/login');
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-400 text-sm">Loading admin dashboard...</p>
      </div>
    </div>
  );

  const chartData = stats ? (chartView === 'orders' ? stats.last30Days?.map(d => ({ ...d, val: d.orders })) : stats.last30Days?.map(d => ({ ...d, val: d.revenue }))) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-3xl mb-3">⚠️</div>
            <h2 className="font-bold text-gray-900 text-lg mb-2">Delete {confirmDelete.name}?</h2>
            <p className="text-sm text-gray-500 mb-5">This permanently deletes the shop, all orders, and all customers. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold">
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: primary }}>
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-none">Souqly Admin</h1>
            <p className="text-xs text-gray-400">FaizeCart · GSTIN: 32AAFCF7417G1ZU</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-xl p-1">
            {[['overview', '📊 Overview'], ['shops', '🏪 Shops']].map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-100">
            Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ── OVERVIEW TAB ─────────────────────────────────── */}
        {tab === 'overview' && stats && (
          <div className="space-y-5">

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Shops',       value: stats.totalShops,                  sub: `+${stats.newShopsThisMonth} this month`, icon: '🏪',  color: 'text-blue-600' },
                { label: 'Active Shops',      value: stats.activeShops,                 sub: `${stats.suspendedShops} suspended`,       icon: '✅',  color: 'text-green-600' },
                { label: 'Total Orders',      value: stats.totalOrders.toLocaleString(), sub: 'across all shops',                       icon: '📦',  color: 'text-orange-600' },
                { label: 'Platform GMV',      value: `₹${Math.round(stats.totalRevenue).toLocaleString('en-IN')}`, sub: 'all-time revenue', icon: '💰', color: 'text-purple-600' },
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="text-3xl mb-3">{c.icon}</div>
                  <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                  <div className="text-xs text-gray-400 mt-1 font-medium">{c.label}</div>
                  <div className="text-xs text-gray-300 mt-0.5">{c.sub}</div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {/* 30-day chart */}
              <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-bold text-gray-900 text-sm">Last 30 Days</div>
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    {['orders', 'revenue'].map(v => (
                      <button key={v} onClick={() => setChartView(v)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${chartView === v ? 'bg-white shadow text-gray-900' : 'text-gray-400'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <BarChart data={chartData} xKey="_id" yKey="val" />
              </div>

              {/* Plan breakdown */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="font-bold text-gray-900 text-sm mb-4">Plan Breakdown</div>
                {stats.planBreakdown.map(p => {
                  const pct = stats.totalShops > 0 ? Math.round((p.count / stats.totalShops) * 100) : 0;
                  return (
                    <div key={p._id} className="mb-3">
                      <div className="flex justify-between mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${PLAN_BADGE[p._id] || 'bg-gray-100 text-gray-600'}`}>{p._id}</span>
                        <span className="text-xs font-bold text-gray-700">{p.count} shops · {pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full">
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: primary }}></div>
                      </div>
                    </div>
                  );
                })}
                <div className="mt-4 pt-3 border-t border-gray-50">
                  <div className="text-xs text-gray-400">Total Customers</div>
                  <div className="text-2xl font-bold text-blue-600">{stats.totalCustomers.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Top Shops */}
            {stats.topShops?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="font-bold text-gray-900 text-sm mb-4">Top Shops by Revenue</div>
                <div className="space-y-3">
                  {stats.topShops.map((shop, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : primary }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900 truncate">{shop.name}</div>
                        <div className="text-xs text-gray-400">{shop.city} · {shop.orders} orders</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${PLAN_BADGE[shop.plan]}`}>{shop.plan}</span>
                      <div className="font-bold text-sm" style={{ color: primary }}>₹{shop.revenue.toLocaleString('en-IN')}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last 7 days table */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="font-bold text-gray-900 text-sm mb-4">Last 7 Days</div>
              {stats.last7Days.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">No orders in the last 7 days</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 text-xs border-b border-gray-50">
                      <th className="pb-2 pr-6 font-semibold">Date</th>
                      <th className="pb-2 pr-6 font-semibold">Orders</th>
                      <th className="pb-2 font-semibold">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stats.last7Days.map(d => (
                      <tr key={d._id}>
                        <td className="py-2.5 pr-6 text-gray-500 text-xs">{d._id}</td>
                        <td className="py-2.5 pr-6 font-semibold text-gray-900">{d.orders}</td>
                        <td className="py-2.5 font-bold" style={{ color: primary }}>₹{d.revenue.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── SHOPS TAB ────────────────────────────────────── */}
        {tab === 'shops' && (
          <div className={`flex gap-5 ${selectedShop ? '' : ''}`}>

            {/* Shop List */}
            <div className={`${selectedShop ? 'w-1/2' : 'w-full'} space-y-3 flex-shrink-0`}>

              {/* Filters */}
              <div className="flex gap-2 flex-wrap">
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search shops, owners, emails..."
                  className="flex-1 min-w-48 border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                />
                <select value={filterPlan} onChange={e => { setFilterPlan(e.target.value); setPage(1); }}
                  className="border border-gray-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                  <option value="">All Plans</option>
                  {PLANS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                </select>
                <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                  className="border border-gray-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400 font-medium">{total} shops</div>
                {shopsLoading && <div className="text-xs text-gray-400">Loading...</div>}
              </div>

              <div className="space-y-2">
                {shops.map(shop => (
                  <div key={shop._id}
                    onClick={() => openShop(shop)}
                    className={`bg-white rounded-2xl border cursor-pointer hover:shadow-sm transition-all p-4 ${selectedShop?._id === shop._id ? 'border-orange-400 shadow-sm' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0 text-sm"
                        style={{ backgroundColor: primary }}>
                        {shop.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm truncate">{shop.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${PLAN_BADGE[shop.plan]}`}>{shop.plan}</span>
                        </div>
                        <div className="text-xs text-gray-400 truncate mt-0.5">{shop.ownerName} · {shop.city} · {shop.email}</div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className={`text-xs font-semibold ${shop.isActive ? 'text-green-600' : 'text-red-500'}`}>
                          {shop.isActive ? '● Active' : '● Suspended'}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{shop.totalOrders || 0} orders</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {total > 15 && (
                <div className="flex gap-2 justify-center pt-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white disabled:opacity-40">← Prev</button>
                  <span className="px-4 py-2 text-sm text-gray-500 bg-white rounded-xl border border-gray-200">Page {page}</span>
                  <button onClick={() => setPage(p => p + 1)} disabled={page * 15 >= total}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white disabled:opacity-40">Next →</button>
                </div>
              )}
            </div>

            {/* Shop Detail Panel */}
            {selectedShop && (
              <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6 h-fit sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg"
                      style={{ backgroundColor: primary }}>
                      {selectedShop.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900">{selectedShop.name}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${PLAN_BADGE[selectedShop.plan]}`}>{selectedShop.plan}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedShop(null)} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center">×</button>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: 'Orders',    value: selectedShop.orderCount ?? selectedShop.totalOrders ?? 0 },
                    { label: 'Customers', value: selectedShop.customerCount ?? '—' },
                    { label: 'Revenue',   value: `₹${(selectedShop.revenue ?? 0).toLocaleString('en-IN')}` }
                  ].map((s, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="font-bold text-gray-900 text-sm">{s.value}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm mb-4">
                  {[
                    ['Owner',    selectedShop.ownerName],
                    ['Email',    selectedShop.email],
                    ['Phone',    selectedShop.phone],
                    ['City',     selectedShop.city],
                    ['Category', selectedShop.category],
                    ['Slug',     selectedShop.slug],
                    ['Joined',   new Date(selectedShop.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })],
                    ['GSTIN',    selectedShop.gstin || '—'],
                    ['Status',   selectedShop.isActive ? 'Active' : 'Suspended'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between border-b border-gray-50 pb-1.5">
                      <span className="text-gray-400 text-xs">{label}</span>
                      <span className="font-medium text-gray-900 text-xs text-right max-w-40 truncate">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Recent Orders */}
                {selectedShop.recentOrders?.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Orders</div>
                    <div className="space-y-1.5">
                      {selectedShop.recentOrders.map(o => (
                        <div key={o._id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">#{o.orderId} · {o.customerName}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">₹{o.total}</span>
                            <span className={`px-1.5 py-0.5 rounded-md font-medium ${
                              o.orderStatus === 'delivered' ? 'bg-green-100 text-green-700'
                              : o.orderStatus === 'cancelled' ? 'bg-red-100 text-red-600'
                              : 'bg-orange-100 text-orange-700'
                            }`}>{o.orderStatus}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Plan Change */}
                <div className="mb-3">
                  <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Change Plan</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PLANS.map(p => (
                      <button key={p} onClick={() => handlePlanChange(selectedShop._id, p)}
                        className={`py-2 rounded-xl text-xs font-semibold border-2 transition-colors capitalize ${selectedShop.plan === p ? 'border-orange-400 text-white' : 'border-gray-200 text-gray-500 hover:border-orange-300'}`}
                        style={selectedShop.plan === p ? { backgroundColor: primary } : {}}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button onClick={() => handleSuspend(selectedShop)}
                      className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition-colors ${selectedShop.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                      {selectedShop.isActive ? '🚫 Suspend' : '✅ Activate'}
                    </button>
                    <button onClick={() => handleImpersonate(selectedShop)}
                      className="flex-1 py-2.5 rounded-xl font-semibold text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                      🔑 Login as Shop
                    </button>
                  </div>
                  <a href={`/store/${selectedShop.slug}`} target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border-2 border-gray-200 text-xs font-semibold text-gray-600 hover:border-orange-400 hover:text-orange-500 transition-colors">
                    🔗 View Storefront
                  </a>
                  <button onClick={() => setConfirmDelete(selectedShop)}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100">
                    🗑️ Delete Shop Permanently
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
