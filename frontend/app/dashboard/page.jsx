'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp, ShoppingBag, Clock, Users, Copy, Check, ExternalLink, Package, ArrowRight } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import { API_URL } from '../../lib/config';

const STATUS = {
  new:              { bg: 'rgba(59,130,246,0.1)',  text: '#60a5fa', border: 'rgba(59,130,246,0.2)' },
  confirmed:        { bg: 'rgba(245,158,11,0.1)',  text: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
  packing:          { bg: 'rgba(249,115,22,0.1)',  text: '#fb923c', border: 'rgba(249,115,22,0.2)' },
  out_for_delivery: { bg: 'rgba(168,85,247,0.1)',  text: '#c084fc', border: 'rgba(168,85,247,0.2)' },
  delivered:        { bg: 'rgba(34,197,94,0.1)',   text: '#4ade80', border: 'rgba(34,197,94,0.2)'  },
  cancelled:        { bg: 'rgba(239,68,68,0.1)',   text: '#f87171', border: 'rgba(239,68,68,0.2)'  },
};

const QUICK = [
  { href: '/dashboard/products', label: 'Add Products',   desc: 'Upload or add items to your store',  color: '#3b82f6' },
  { href: '/dashboard/whatsapp', label: 'Setup WhatsApp', desc: 'Connect WhatsApp for order alerts',  color: '#22c55e' },
  { href: '/dashboard/settings', label: 'Shop Settings',  desc: 'Update logo, hours, and info',       color: '#a855f7' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [shop,         setShop]         = useState(null);
  const [stats,        setStats]        = useState({ todayOrders: 0, todayRevenue: 0, pendingOrders: 0, totalCustomers: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [copied,       setCopied]       = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const t = p.get('token');
      if (t) { localStorage.setItem('ownerToken', t); window.history.replaceState({}, '', '/dashboard'); }
    }
    const shopData = localStorage.getItem('souqly_shop');
    const token    = localStorage.getItem('ownerToken');
    if (!shopData || !token) { router.push('/login'); return; }
    setShop(JSON.parse(shopData));

    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_URL}/analytics/summary`, { headers: h }).then(r => r.json()).catch(() => ({})),
      fetch(`${API_URL}/orders?limit=5`,    { headers: h }).then(r => r.json()).catch(() => ({})),
    ]).then(([s, o]) => {
      if (s.success) setStats(s.data);
      if (o.success) setRecentOrders(o.orders || []);
    }).finally(() => setLoading(false));
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/store/${shop?.slug}`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #1f1f1f', borderTopColor: '#FF6B35', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#606060', fontSize: 13 }}>Loading dashboard...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const STATS = [
    { label: "Today's Orders",   value: stats.todayOrders,                                    icon: ShoppingBag, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
    { label: "Today's Revenue",  value: `₹${(stats.todayRevenue||0).toLocaleString()}`,  icon: TrendingUp,  color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
    { label: 'Pending Orders',   value: stats.pendingOrders,                                  icon: Clock,       color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
    { label: 'Total Customers',  value: stats.totalCustomers,                                 icon: Users,       color: '#a855f7', bg: 'rgba(168,85,247,0.1)'  },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />

      <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>Dashboard</h1>
            <p style={{ fontSize: 13, color: '#606060', marginTop: 3 }}>Welcome back, {shop?.ownerName || shop?.name}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={copyLink} className="btn-ghost" style={{ fontSize: 13, padding: '9px 16px' }}>
              {copied
                ? <><Check size={14} style={{ color: '#22c55e' }} /> Copied!</>
                : <><Copy size={14} /> Copy Store Link</>
              }
            </button>
            {shop?.slug && (
              <Link href={`/store/${shop.slug}`} target="_blank" className="btn-primary" style={{ fontSize: 13, padding: '9px 16px' }}>
                <ExternalLink size={14} /> View Store
              </Link>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          {STATS.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="stat-card">
              <div style={{ width: 38, height: 38, background: bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>{value}</div>
              <div style={{ fontSize: 12, color: '#606060', marginTop: 4, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Recent Orders */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Recent Orders</h2>
            <Link href="/dashboard/orders" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#FF6B35', fontWeight: 600 }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ width: 52, height: 52, background: '#161616', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Package size={24} style={{ color: '#3a3a3a' }} />
              </div>
              <p style={{ color: '#606060', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No orders yet</p>
              <p style={{ color: '#3a3a3a', fontSize: 12, marginBottom: 20 }}>Share your store link to start receiving orders</p>
              <button onClick={copyLink} className="btn-primary" style={{ fontSize: 13, padding: '9px 18px' }}>
                <Copy size={14} /> Copy Store Link
              </button>
            </div>
          ) : (
            <div>
              {recentOrders.map(order => {
                const s = STATUS[order.orderStatus] || { bg: 'rgba(96,96,96,0.1)', text: '#606060', border: 'rgba(96,96,96,0.2)' };
                return (
                  <div key={order._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid #1f1f1f' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>#{order.orderId}</span>
                        <span style={{ fontSize: 13, color: '#a0a0a0' }}>{order.customerName}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#606060', marginTop: 3 }}>
                        {order.items?.length} item{order.items?.length !== 1 ? 's' : ''} &middot; &#8377;{order.total?.toLocaleString()}
                      </div>
                    </div>
                    <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                      {order.orderStatus?.replace(/_/g, ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {QUICK.map(({ href, label, desc, color }) => (
            <Link key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#0f0f0f', border: '1px solid #1f1f1f', borderRadius: 14, padding: '18px 20px', textDecoration: 'none', transition: 'border-color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2a2a2a'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1f1f1f'; }}
            >
              <div style={{ width: 36, height: 36, background: `${color}18`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ArrowRight size={16} style={{ color }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>{label}</div>
                <div style={{ fontSize: 12, color: '#606060', marginTop: 2 }}>{desc}</div>
              </div>
            </Link>
          ))}
        </div>

      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
