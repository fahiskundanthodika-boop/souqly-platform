'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_URL } from '../../lib/config';

export default function DashboardPage() {
  const router = useRouter();
  const [shop, setShop] = useState(null);
  const [stats, setStats] = useState({ todayOrders: 0, todayRevenue: 0, pendingOrders: 0, totalCustomers: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const shopData = localStorage.getItem('souqly_shop');
    if (!shopData) { router.push('/login'); return; }
    setShop(JSON.parse(shopData));

    // Load stats
    fetch(`${API_URL}/analytics/summary`, {
      credentials: 'include'
    })
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.data); })
      .catch(() => {});

    // Load recent orders
    fetch(`${API_URL}/orders?limit=5`, {
      credentials: 'include'
    })
      .then(r => r.json())
      .then(d => { if (d.success) setRecentOrders(d.orders); })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Safety fallback - stop loading after 3 seconds no matter what
    setTimeout(() => setLoading(false), 3000);
  }, []);

  const logout = async () => {
    await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    localStorage.clear();
    router.push('/login');
  };

  const statusColors = {
    new: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-yellow-100 text-yellow-700',
    packing: 'bg-orange-100 text-orange-700',
    out_for_delivery: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-500 text-sm">Loading dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 min-h-screen p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="font-bold text-gray-900 text-sm truncate">{shop?.name}</span>
        </div>

        <nav className="space-y-1 flex-1">
          {[
            { href: '/dashboard', label: 'Dashboard', icon: 'ðŸ“Š' },
            { href: '/dashboard/orders', label: 'Orders', icon: 'ðŸ“¦' },
            { href: '/dashboard/products', label: 'Products', icon: 'ðŸ›ï¸' },
            { href: '/dashboard/riders', label: 'Riders', icon: 'ðŸ›µ' },
            { href: '/dashboard/analytics', label: 'Analytics', icon: 'ðŸ“ˆ' },
            { href: '/dashboard/coupons', label: 'Coupons', icon: 'ðŸŽŸï¸' },
            { href: '/dashboard/reviews', label: 'Reviews', icon: 'â­' },
            { href: '/dashboard/marketing', label: 'Marketing', icon: 'ðŸ“£' },
            { href: '/dashboard/settings', label: 'Settings', icon: 'âš™ï¸' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-orange-50 hover:text-orange-500 transition-colors">
              <span>{item.icon}</span>{item.label}
            </Link>
          ))}
        </nav>

        <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors mt-4">
          ðŸšª Logout
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-400 text-sm">{shop?.name} Â· {shop?.plan?.toUpperCase()} Plan</p>
          </div>
          <Link href={`/store/${shop?.slug}`} target="_blank"
            className="text-sm text-orange-500 hover:underline border border-orange-200 px-3 py-1.5 rounded-lg">
            View Store â†’
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Today's Orders", value: stats.todayOrders, icon: 'ðŸ“¦', color: 'bg-blue-50 text-blue-600' },
            { label: "Today's Revenue", value: `â‚¹${stats.todayRevenue}`, icon: 'ðŸ’°', color: 'bg-green-50 text-green-600' },
            { label: 'Pending', value: stats.pendingOrders, icon: 'â³', color: 'bg-orange-50 text-orange-600' },
            { label: 'Customers', value: stats.totalCustomers, icon: 'ðŸ‘¥', color: 'bg-purple-50 text-purple-600' },
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${card.color}`}>
                {card.icon}
              </div>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-xs text-gray-400 mt-1">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Recent Orders</h2>
            <Link href="/dashboard/orders" className="text-orange-500 text-sm hover:underline">View all â†’</Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">ðŸ“¦</div>
              <p className="text-gray-400 text-sm mb-4">No orders yet.</p>
              <button
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/store/${shop?.slug}`); alert('Store link copied!'); }}
                className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-medium">
                Copy Your Store Link
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map(order => (
                <div key={order._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <div className="font-medium text-sm text-gray-900">#{order.orderId} Â· {order.customerName}</div>
                    <div className="text-xs text-gray-400">{order.items?.length} items Â· â‚¹{order.total}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[order.orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                    {order.orderStatus?.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}


