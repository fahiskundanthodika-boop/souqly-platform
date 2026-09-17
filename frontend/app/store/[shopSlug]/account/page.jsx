'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { API_URL as API } from '../../../../lib/config';

const STATUS_LABELS = {
  new: { label: 'Order Placed', color: '#6366f1', bg: '#eef2ff' },
  confirmed: { label: 'Confirmed', color: '#0ea5e9', bg: '#f0f9ff' },
  packing: { label: 'Packing', color: '#f59e0b', bg: '#fffbeb' },
  out_for_delivery: { label: 'Out for Delivery', color: '#FF6B35', bg: '#fff7ed' },
  delivered: { label: 'Delivered', color: '#22c55e', bg: '#f0fdf4' },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: '#fef2f2' },
};

export default function AccountPage() {
  const { shopSlug } = useParams();
  const router = useRouter();

  const [shop, setShop] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);

  const primary = shop?.primaryColor || '#FF6B35';

  useEffect(() => {
    const token = localStorage.getItem(`customer_token_${shopSlug}`);
    if (!token) {
      router.replace(`/store/${shopSlug}/login`);
      return;
    }

    fetch(`${API}/shop/public/${shopSlug}`)
      .then(r => r.json())
      .then(d => { if (d.success) setShop(d.shop); });

    Promise.all([
      fetch(`${API}/customer/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/customer/orders`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    ]).then(([me, ord]) => {
      if (!me.success) {
        localStorage.removeItem(`customer_token_${shopSlug}`);
        router.replace(`/store/${shopSlug}/login`);
        return;
      }
      setCustomer(me.customer);
      if (ord.success) setOrders(ord.orders);
    }).catch(() => {
      router.replace(`/store/${shopSlug}/login`);
    }).finally(() => setLoading(false));
  }, [shopSlug]);

  const handleLogout = () => {
    localStorage.removeItem(`customer_token_${shopSlug}`);
    localStorage.removeItem(`customer_${shopSlug}`);
    router.push(`/store/${shopSlug}`);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: `${primary}40`, borderTopColor: primary }} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* Header */}
      <header className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <Link href={`/store/${shopSlug}`}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600">
          ←
        </Link>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900">My Account</h1>
          <p className="text-xs text-gray-400">{shop?.name}</p>
        </div>
        <button onClick={handleLogout} className="text-xs text-red-500 font-medium px-3 py-1.5 rounded-xl border border-red-200">
          Logout
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
              style={{ backgroundColor: primary }}>
              {customer?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div className="font-bold text-gray-900 text-lg">{customer?.name}</div>
              <div className="text-sm text-gray-500">{customer?.phone}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-50">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{customer?.totalOrders || 0}</div>
              <div className="text-xs text-gray-400">Orders</div>
            </div>
            <div className="text-center border-x border-gray-100">
              <div className="text-xl font-bold text-gray-900">₹{customer?.totalSpent || 0}</div>
              <div className="text-xs text-gray-400">Total Spent</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{customer?.loyaltyPoints || 0}</div>
              <div className="text-xs text-gray-400">Points</div>
            </div>
          </div>
        </div>

        {/* Order History */}
        <div>
          <h2 className="font-bold text-gray-900 mb-3">Order History</h2>

          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <div className="text-4xl mb-3">🛍️</div>
              <div className="font-semibold text-gray-700">No orders yet</div>
              <div className="text-sm text-gray-400 mt-1">Your orders will appear here</div>
              <Link href={`/store/${shopSlug}`}
                className="inline-block mt-4 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
                style={{ backgroundColor: primary }}>
                Start Shopping →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => {
                const status = STATUS_LABELS[order.orderStatus] || STATUS_LABELS.new;
                const isExpanded = expandedOrder === order._id;
                return (
                  <div key={order._id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <button
                      onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                      className="w-full p-4 flex items-center gap-3 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900 text-sm">#{order.orderId}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ color: status.color, backgroundColor: status.bg }}>
                            {status.label}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDate(order.createdAt)} · {order.items.length} item{order.items.length > 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">₹{order.total}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{isExpanded ? '▲' : '▼'}</div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-50 px-4 pb-4">
                        <div className="space-y-2 mt-3">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                                {item.image
                                  ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center text-base">🛍️</div>
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                                <div className="text-xs text-gray-400">₹{item.price} × {item.qty}</div>
                              </div>
                              <div className="text-sm font-semibold text-gray-900">₹{item.total}</div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between text-sm">
                          <span className="text-gray-500">Delivery</span>
                          <span className="text-gray-700">
                            {order.deliveryCharge === 0 ? 'Free' : `₹${order.deliveryCharge}`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-gray-900">Total</span>
                          <span className="font-bold text-lg" style={{ color: primary }}>₹{order.total}</span>
                        </div>
                        {order.orderStatus === 'delivered' || order.orderStatus === 'out_for_delivery' ? (
                          <Link href={`/track/${order._id}`}
                            className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 text-sm font-semibold"
                            style={{ borderColor: primary, color: primary }}>
                            📍 Track Order
                          </Link>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
