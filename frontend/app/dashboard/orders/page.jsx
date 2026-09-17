'use client';
import { useEffect, useState, useRef, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

const STATUS_OPTIONS = ['new', 'confirmed', 'packing', 'out_for_delivery', 'delivered', 'cancelled'];
const STATUS_LABELS = {
  new: 'New',
  confirmed: 'Confirmed',
  packing: 'Packing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};
const STATUS_COLORS = {
  new:              { bg: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6' },
  confirmed:        { bg: '#fef9c3', text: '#854d0e', dot: '#eab308' },
  packing:          { bg: '#ffedd5', text: '#9a3412', dot: '#f97316' },
  out_for_delivery: { bg: '#ede9fe', text: '#6b21a8', dot: '#a855f7' },
  delivered:        { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
  cancelled:        { bg: '#fee2e2', text: '#b91c1c', dot: '#ef4444' }
};
const PAYMENT_LABELS = {
  cod: 'ðŸ’µ Cash',
  card_on_delivery: 'ðŸ’³ Card',
  pickup: 'ðŸª Pickup',
  bank_transfer: 'ðŸ¦ Bank',
  online: 'ðŸŒ Online'
};
const CHANNEL_LABELS = {
  website: 'ðŸŒ Web',
  whatsapp: 'ðŸ’¬ WhatsApp',
  pos: 'ðŸ–¥ï¸ POS',
  manual: 'âœï¸ Manual'
};

// â”€â”€ Web Audio ping: 3 beeps 880â†’1100â†’880 Hz â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function playPing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = (freq, start, dur) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + start);
      g.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.01);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur - 0.05);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + start + dur);
    };
    beep(880,  0,    0.18);
    beep(1100, 0.22, 0.18);
    beep(880,  0.44, 0.22);
    setTimeout(() => ctx.close(), 1200);
  } catch (e) {}
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// â”€â”€ Reject reason modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function RejectModal({ order, onClose, onConfirm }) {
  const reasons = ['Out of stock', 'Shop closed', 'Delivery not available', 'Customer request', 'Other'];
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="font-bold text-gray-900 text-lg mb-1">Reject Order #{order.orderId}</h3>
        <p className="text-gray-400 text-sm mb-4">Select a reason</p>
        <div className="space-y-2 mb-5">
          {reasons.map(r => (
            <label key={r} className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all"
              style={{ borderColor: reason === r ? '#ef4444' : '#e5e7eb', backgroundColor: reason === r ? '#fef2f2' : 'white' }}>
              <input type="radio" name="reason" value={r} checked={reason === r}
                onChange={() => setReason(r)} className="sr-only" />
              <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{ borderColor: reason === r ? '#ef4444' : '#d1d5db' }}>
                {reason === r && <div className="w-2 h-2 rounded-full bg-red-500"></div>}
              </div>
              <span className="text-sm text-gray-700">{r}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">
            Cancel
          </button>
          <button disabled={!reason} onClick={() => onConfirm(reason)}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm disabled:opacity-40">
            Reject Order
          </button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Single Order Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OrderCard({ order, riders, onStatusChange, onAssignRider, isNew }) {
  const [expanded, setExpanded] = useState(isNew);
  const [assigning, setAssigning] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const sc = STATUS_COLORS[order.orderStatus] || STATUS_COLORS.new;

  const mapsLink = order.customerLocation?.lat
    ? `https://maps.google.com/?q=${order.customerLocation.lat},${order.customerLocation.lng}`
    : `https://maps.google.com/?q=${encodeURIComponent(order.customerAddress || '')}`;

  const whatsappLink = order.customerPhone
    ? `https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${order.customerName}, your order #${order.orderId} has been received! Total: â‚¹${order.total}`)}`
    : null;

  return (
    <>
      {showReject && (
        <RejectModal
          order={order}
          onClose={() => setShowReject(false)}
          onConfirm={(reason) => { setShowReject(false); onStatusChange(order._id, 'cancelled', reason); }}
        />
      )}
      <div className={`bg-white rounded-2xl border-2 overflow-hidden transition-all duration-500 ${isNew ? 'new-order-flash' : 'border-gray-100'}`}
        style={isNew ? { borderColor: '#FF6B35' } : {}}>

        {/* Header â€” always visible, click to expand */}
        <div className="p-4 cursor-pointer select-none" onClick={() => setExpanded(e => !e)}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-lg" style={{ color: '#FF6B35' }}>#{order.orderId}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"
                  style={{ backgroundColor: sc.bg, color: sc.text }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: sc.dot }}></span>
                  {STATUS_LABELS[order.orderStatus]}
                </span>
                {isNew && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-600 animate-pulse">
                    NEW âœ¨
                  </span>
                )}
              </div>
              <div className="mt-1 font-semibold text-gray-900">{order.customerName}</div>
              <div className="text-gray-400 text-sm">{order.customerPhone}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-bold text-gray-900 text-base">â‚¹{order.total}</div>
              <div className="text-xs text-gray-400 mt-0.5">{timeAgo(order.createdAt)}</div>
              <div className="text-gray-400 text-sm mt-1">{expanded ? 'â–²' : 'â–¼'}</div>
            </div>
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
              {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
            </span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
              {CHANNEL_LABELS[order.channel] || order.channel}
            </span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
              {order.items?.length || 0} items
            </span>
          </div>
        </div>

        {/* Expanded body */}
        {expanded && (
          <div className="border-t border-gray-50 px-4 pb-4 space-y-4">

            {/* Address + Maps */}
            {order.customerAddress && (
              <div className="flex items-start gap-2 pt-3">
                <span className="text-lg flex-shrink-0 mt-0.5">ðŸ“</span>
                <div className="flex-1">
                  <div className="text-sm text-gray-700 leading-snug">{order.customerAddress}</div>
                  <a href={mapsLink} target="_blank" rel="noreferrer"
                    className="text-xs font-semibold mt-1 inline-block"
                    style={{ color: '#FF6B35' }}>
                    Open in Google Maps â†’
                  </a>
                </div>
              </div>
            )}

            {/* Items */}
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Items Ordered</div>
              <div className="space-y-1.5">
                {order.items?.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                      {item.image
                        ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-sm">ðŸ›ï¸</div>
                      }
                    </div>
                    <div className="flex-1 text-sm text-gray-800 truncate">{item.name}</div>
                    <div className="text-xs text-gray-400 flex-shrink-0">Ã—{item.qty}</div>
                    <div className="text-sm font-bold text-gray-900 flex-shrink-0 w-14 text-right">â‚¹{item.total}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bill */}
            <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1.5">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span>â‚¹{order.subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Delivery</span>
                <span className={order.deliveryCharge === 0 ? 'text-green-600 font-medium' : ''}>
                  {order.deliveryCharge === 0 ? 'Free' : `â‚¹${order.deliveryCharge}`}
                </span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-gray-200">
                <span>Total</span><span style={{ color: '#FF6B35' }}>â‚¹{order.total}</span>
              </div>
            </div>

            {/* Customer notes */}
            {order.notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2.5 text-sm text-yellow-800">
                ðŸ“ <span className="font-medium">Note:</span> {order.notes}
              </div>
            )}

            {/* Assign Rider */}
            {['confirmed', 'packing'].includes(order.orderStatus) && riders.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Assign Rider</div>
                <div className="flex gap-2 items-center">
                  <select
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                    defaultValue={order.riderId?._id || order.riderId || ''}
                    onChange={async (e) => {
                      if (!e.target.value) return;
                      setAssigning(true);
                      await onAssignRider(order._id, e.target.value);
                      setAssigning(false);
                    }}
                  >
                    <option value="">Select rider...</option>
                    {riders.map(r => (
                      <option key={r._id} value={r._id}>{r.name} â€” {r.phone}</option>
                    ))}
                  </select>
                  {assigning && (
                    <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
              {order.orderStatus === 'new' && (
                <>
                  <button onClick={() => onStatusChange(order._id, 'confirmed')}
                    className="flex-1 py-3 rounded-xl text-white font-bold text-sm min-w-[120px]"
                    style={{ backgroundColor: '#22c55e' }}>
                    âœ“ Accept Order
                  </button>
                  <button onClick={() => setShowReject(true)}
                    className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm min-w-[120px]">
                    âœ— Reject
                  </button>
                </>
              )}
              {order.orderStatus === 'confirmed' && (
                <button onClick={() => onStatusChange(order._id, 'packing')}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-sm"
                  style={{ backgroundColor: '#f97316' }}>
                  ðŸ“¦ Start Packing
                </button>
              )}
              {order.orderStatus === 'packing' && (
                <button onClick={() => onStatusChange(order._id, 'out_for_delivery')}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-sm"
                  style={{ backgroundColor: '#a855f7' }}>
                  ðŸ›µ Send for Delivery
                </button>
              )}
              {order.orderStatus === 'out_for_delivery' && (
                <button onClick={() => onStatusChange(order._id, 'delivered')}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-sm"
                  style={{ backgroundColor: '#22c55e' }}>
                  âœ… Mark Delivered
                </button>
              )}
              {whatsappLink && (
                <a href={whatsappLink} target="_blank" rel="noreferrer"
                  className="px-4 py-3 rounded-xl text-white font-bold text-sm"
                  style={{ backgroundColor: '#25D366' }}>
                  ðŸ“² WhatsApp
                </a>
              )}
            </div>

          </div>
        )}
      </div>
    </>
  );
}

// â”€â”€ MAIN PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('new');
  const [loading, setLoading] = useState(false);
  const [newOrderIds, setNewOrderIds] = useState(new Set());

  const getToken = () => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/souqly_token=([^;]+)/);
    return match ? match[1] : null;
  };

  const authHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchOrders = useCallback(async (status) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/orders?status=${status}&limit=50`, {
        headers: authHeaders(), credentials: 'include'
      });
      const data = await res.json();
      if (data.success) setOrders(data.orders);
    } catch (e) {}
    setLoading(false);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/analytics/summary`, {
        headers: authHeaders(), credentials: 'include'
      });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (e) {}
  }, []);

  const fetchRiders = useCallback(async () => {
    try {
      const res = await fetch(`${API}/riders`, {
        headers: authHeaders(), credentials: 'include'
      });
      const data = await res.json();
      if (data.success) setRiders(data.riders || []);
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchOrders('new');
    fetchStats();
    fetchRiders();
  }, []);

  useEffect(() => {
    fetchOrders(tab);
  }, [tab]);

  // â”€â”€ Socket.io â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    let socket;
    import('socket.io-client').then(({ io }) => {
      const shopInfo = JSON.parse(localStorage.getItem('shopInfo') || '{}');
      socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

      socket.on('connect', () => {
        if (shopInfo._id) socket.emit('join_shop', shopInfo._id);
      });

      socket.on('new_order', (newOrder) => {
        // Sound
        playPing();

        // Prepend to list if on new tab
        setOrders(prev => {
          if (newOrder.orderStatus !== 'new') return prev;
          const exists = prev.some(o => o._id === newOrder._id);
          return exists ? prev : [newOrder, ...prev];
        });

        // Flash for 4 seconds
        setNewOrderIds(prev => new Set([...prev, newOrder._id]));
        setTimeout(() => {
          setNewOrderIds(prev => {
            const next = new Set(prev);
            next.delete(newOrder._id);
            return next;
          });
        }, 4000);

        fetchStats();

        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`ðŸ›ï¸ New Order #${newOrder.orderId}`, {
            body: `${newOrder.customerName} Â· â‚¹${newOrder.total}`,
            icon: '/favicon.ico'
          });
        }
      });

      socket.on('order_status_update', ({ orderId, orderStatus }) => {
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, orderStatus } : o));
      });
    });

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => { if (socket) socket.disconnect(); };
  }, []);

  // â”€â”€ Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleStatusChange = async (orderId, newStatus, rejectReason) => {
    try {
      const body = { orderStatus: newStatus };
      if (rejectReason) body.rejectReason = rejectReason;
      await fetch(`${API}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, orderStatus: newStatus } : o));
      fetchStats();
    } catch (e) {}
  };

  const handleAssignRider = async (orderId, riderId) => {
    try {
      await fetch(`${API}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        credentials: 'include',
        body: JSON.stringify({ orderStatus: 'out_for_delivery', riderId })
      });
      setOrders(prev => prev.map(o =>
        o._id === orderId ? { ...o, riderId, orderStatus: 'out_for_delivery' } : o
      ));
      fetchStats();
    } catch (e) {}
  };

  const visibleOrders = orders.filter(o => o.orderStatus === tab);

  return (
    <>
      <style>{`
        @keyframes orderFlash {
          0%   { box-shadow: 0 0 0 4px #FF6B3550; }
          50%  { box-shadow: 0 0 0 8px #FF6B3525; }
          100% { box-shadow: 0 0 0 0  transparent; }
        }
        .new-order-flash { animation: orderFlash 0.7s ease-in-out 3; }
      `}</style>

      <div className="min-h-screen bg-gray-50">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
              <p className="text-sm text-gray-400">Real-time Â· live updates</p>
            </div>
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-xs text-green-700 font-semibold">Live</span>
            </div>
          </div>

          {/* Stats bar */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Today's Orders",   value: stats.todayOrders,    icon: 'ðŸ“¦', highlight: false },
                { label: "Today's Revenue",  value: `â‚¹${stats.todayRevenue}`, icon: 'ðŸ’°', highlight: false },
                { label: 'Pending',          value: stats.pendingOrders,  icon: 'â³', highlight: stats.pendingOrders > 0 },
                { label: 'Total Customers',  value: stats.totalCustomers, icon: 'ðŸ‘¥', highlight: false },
              ].map(s => (
                <div key={s.label}
                  className="rounded-2xl p-3 text-center border"
                  style={{ backgroundColor: s.highlight ? '#fff7ed' : '#f9fafb', borderColor: s.highlight ? '#fed7aa' : '#f3f4f6' }}>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="font-bold text-gray-900 text-xl leading-none">{s.value}</div>
                  <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status tabs */}
        <div className="bg-white border-b border-gray-100 overflow-x-auto">
          <div className="flex min-w-max px-2">
            {STATUS_OPTIONS.map(s => {
              const count = orders.filter(o => o.orderStatus === s).length;
              const isActive = tab === s;
              const sc = STATUS_COLORS[s];
              return (
                <button key={s} onClick={() => setTab(s)}
                  className="px-4 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-all"
                  style={isActive
                    ? { borderColor: '#FF6B35', color: '#FF6B35' }
                    : { borderColor: 'transparent', color: '#9ca3af' }
                  }>
                  {STATUS_LABELS[s]}
                  {count > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold"
                      style={{ backgroundColor: s === 'new' && count > 0 ? '#FF6B35' : sc.bg, color: s === 'new' && count > 0 ? 'white' : sc.text }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Orders list */}
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-28 animate-pulse border border-gray-100"></div>
            ))
          ) : visibleOrders.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">
                {tab === 'new' ? 'ðŸ“­' : tab === 'delivered' ? 'ðŸŽ‰' : 'ðŸ“‹'}
              </div>
              <p className="font-semibold text-gray-700">
                {tab === 'new' ? 'No new orders yet' : `No ${STATUS_LABELS[tab].toLowerCase()} orders`}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {tab === 'new' && 'New orders appear here instantly â€” no refresh needed'}
              </p>
            </div>
          ) : (
            visibleOrders.map(order => (
              <OrderCard
                key={order._id}
                order={order}
                riders={riders}
                isNew={newOrderIds.has(order._id)}
                onStatusChange={handleStatusChange}
                onAssignRider={handleAssignRider}
              />
            ))
          )}
        </div>

      </div>
    </>
  );
}


