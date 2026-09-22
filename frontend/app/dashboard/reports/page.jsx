'use client';
import Sidebar from '../../../components/Sidebar';
import { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const primary = '#FF6B35';

function getDefaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 29);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10)
  };
}

const PRESETS = [
  { label: 'Today',      days: 0 },
  { label: 'Last 7d',   days: 6 },
  { label: 'Last 30d',  days: 29 },
  { label: 'Last 90d',  days: 89 },
];

// Simple SVG bar chart
function BarChart({ data }) {
  if (!data || data.length === 0) return <div className="text-center py-8 text-gray-400 text-sm">No data for this period</div>;
  const max = Math.max(...data.map(d => d.revenue), 1);
  const W = 100, barW = Math.max(2, (W / data.length) * 0.6);
  const gap = W / data.length;
  return (
    <div>
      <svg viewBox={`0 0 100 40`} className="w-full h-28" preserveAspectRatio="none">
        {data.map((d, i) => {
          const bh = Math.max(0.5, (d.revenue / max) * 36);
          const x = i * gap + (gap - barW) / 2;
          return <rect key={i} x={x} y={40 - bh} width={barW} height={bh} rx="0.5" fill={primary} opacity="0.85" />;
        })}
      </svg>
      <div className="flex justify-between text-xs text-gray-300 mt-1">
        <span>{data[0]?._id?.slice(5)}</span>
        <span>{data[data.length - 1]?._id?.slice(5)}</span>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [range, setRange] = useState(getDefaultRange());
  const [activePreset, setActivePreset] = useState(2);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('ownerToken') : '';
  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/reports/summary?from=${range.from}&to=${range.to}`, { headers });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {} finally { setLoading(false); }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  function applyPreset(idx) {
    setActivePreset(idx);
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - PRESETS[idx].days);
    setRange({ from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) });
  }

  async function download(type) {
    setDownloading(type);
    try {
      const params = type === 'customers' ? '' : `?from=${range.from}&to=${range.to}`;
      const res = await fetch(`${API}/reports/${type}.csv${params}`, { headers });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-${range.from}-to-${range.to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {} finally { setDownloading(''); }
  }

  const kpis = data ? [
    { label: 'Total Orders',    value: data.totalOrders,                      icon: '📦', sub: `${data.cancelledOrders} cancelled` },
    { label: 'Net Revenue',     value: `₹${data.revenue.toLocaleString('en-IN')}`, icon: '💰', sub: `Avg ₹${data.avgOrderValue}/order` },
    { label: 'Delivery Revenue',value: `₹${data.deliveryRevenue.toLocaleString('en-IN')}`, icon: '🛵', sub: `₹${data.totalDiscount.toLocaleString('en-IN')} discounted` },
    { label: 'New Customers',   value: data.newCustomers,                     icon: '👤', sub: 'in this period' },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50 flex"><Sidebar /><div style={{ padding: '24px', maxWidth: 960, flex: 1, overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700 }}>Reports & Export</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>Analyse sales and download data as CSV</p>
      </div>

      {/* Date range bar */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => applyPreset(i)}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                background: activePreset === i ? primary : '#f3f4f6', color: activePreset === i ? '#fff' : '#4b5563' }}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
          <input type="date" value={range.from} onChange={e => { setRange(r => ({ ...r, from: e.target.value })); setActivePreset(-1); }}
            style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none' }} />
          <span style={{ color: '#9ca3af', fontSize: 13 }}>to</span>
          <input type="date" value={range.to} onChange={e => { setRange(r => ({ ...r, to: e.target.value })); setActivePreset(-1); }}
            style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none' }} />
          <button onClick={load}
            style={{ padding: '6px 16px', borderRadius: 8, background: primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            Apply
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <p>Loading report...</p>
        </div>
      ) : data && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
            {kpis.map((k, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{k.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{k.value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginTop: 2 }}>{k.label}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

            {/* Revenue Chart */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 14 }}>Daily Revenue</div>
              <BarChart data={data.dailyChart} />
              {data.dailyChart?.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
                  <span>Peak: ₹{Math.max(...data.dailyChart.map(d => d.revenue)).toLocaleString('en-IN')}</span>
                  <span>{data.dailyChart.length} days with orders</span>
                </div>
              )}
            </div>

            {/* Top Products */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 14 }}>Top Products</div>
              {data.topProducts?.length === 0 ? (
                <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', paddingTop: 20 }}>No product data</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.topProducts?.map((p, i) => {
                    const maxUnits = data.topProducts[0]?.units || 1;
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 13 }}>
                          <span style={{ color: '#374151', fontWeight: 500, maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p._id}</span>
                          <span style={{ color: primary, fontWeight: 700 }}>{p.units} sold</span>
                        </div>
                        <div style={{ height: 5, background: '#f3f4f6', borderRadius: 99 }}>
                          <div style={{ height: 5, width: `${(p.units / maxUnits) * 100}%`, background: primary, borderRadius: 99 }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

            {/* Order Status Breakdown */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 14 }}>Order Status</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.statusBreakdown?.map(s => {
                  const colors = { delivered: '#16a34a', cancelled: '#ef4444', new: '#f59e0b', confirmed: '#3b82f6', packing: '#8b5cf6', out_for_delivery: primary };
                  return (
                    <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[s._id] || '#9ca3af' }}></div>
                        <span style={{ fontSize: 13, color: '#4b5563', textTransform: 'capitalize' }}>{s._id?.replace(/_/g, ' ')}</span>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{s.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 14 }}>Payment Methods</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.paymentBreakdown?.map(p => (
                  <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <span style={{ color: '#4b5563', textTransform: 'capitalize' }}>{p._id?.replace(/_/g, ' ')}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: '#111827' }}>{p.count} orders</span>
                      <span style={{ color: '#9ca3af', marginLeft: 8 }}>₹{p.total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Export Section */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 4 }}>Export Data</div>
        <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 16px' }}>Download CSV files — open in Excel, Google Sheets, or any spreadsheet app</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { type: 'orders',    label: 'Orders Report',    icon: '📦', desc: `All orders ${range.from} → ${range.to}` },
            { type: 'revenue',   label: 'Revenue Summary',  icon: '💰', desc: `Daily revenue breakdown` },
            { type: 'products',  label: 'Product Sales',    icon: '🛒', desc: `Units sold per product` },
            { type: 'customers', label: 'Customer List',    icon: '👥', desc: `All customers (all time)` },
          ].map(({ type, label, icon, desc }) => (
            <button key={type} onClick={() => download(type)} disabled={downloading === type}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                padding: '16px 18px', borderRadius: 12,
                border: `2px solid ${downloading === type ? primary : '#e5e7eb'}`,
                background: downloading === type ? `${primary}08` : '#fafafa',
                cursor: downloading === type ? 'not-allowed' : 'pointer',
                textAlign: 'left', transition: 'all 0.15s'
              }}>
              <div style={{ fontSize: 24 }}>{downloading === type ? '⏳' : icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{label}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{desc}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: downloading === type ? '#9ca3af' : primary, marginTop: 2 }}>
                {downloading === type ? 'Downloading...' : '↓ Download CSV'}
              </div>
            </button>
          ))}
        </div>
      </div>

    </div></div>
  );
}