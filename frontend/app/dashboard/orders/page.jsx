'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import Sidebar from '../../../components/Sidebar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

const STATUS_OPTIONS = ['new', 'confirmed', 'packing', 'out_for_delivery', 'delivered', 'cancelled'];
const STATUS_LABELS = {
  new: 'New', confirmed: 'Confirmed', packing: 'Packing',
  out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled'
};
const STATUS_COLORS = {
  new:              { bg: '#dbeafe', text: '#1d4ed8' },
  confirmed:        { bg: '#fef9c3', text: '#854d0e' },
  packing:          { bg: '#ffedd5', text: '#9a3412' },
  out_for_delivery: { bg: '#ede9fe', text: '#6b21a8' },
  delivered:        { bg: '#dcfce7', text: '#166534' },
  cancelled:        { bg: '#fee2e2', text: '#b91c1c' },
};
const PAYMENT_LABELS = { cod: 'Cash', card_on_delivery: 'Card', pickup: 'Pickup', bank_transfer: 'Bank', online: 'Online' };
const CHANNEL_LABELS  = { website: 'Web', whatsapp: 'WhatsApp', pos: 'POS', manual: 'Manual' };

function playPing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = (freq, start, dur) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + start);
      g.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.01);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur - 0.05);
      o.start(ctx.currentTime + start); o.stop(ctx.currentTime + start + dur);
    };
    beep(880, 0, 0.18); beep(1100, 0.22, 0.18); beep(880, 0.44, 0.22);
    setTimeout(() => ctx.close(), 1200);
  } catch (e) {}
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// Order detail side panel
function OrderDetail({ order, riders, onStatusChange, onAssignRider, onClose }) {
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState(order.invoiceUrl || null);
  const [showRejectReasons, setShowRejectReasons] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const sc = STATUS_COLORS[order.orderStatus] || STATUS_COLORS.new;

  const mapsLink = order.customerLocation?.lat
    ? `https://maps.google.com/?q=${order.customerLocation.lat},${order.customerLocation.lng}`
    : `https://maps.google.com/?q=${encodeURIComponent(order.customerAddress || '')}`;

  const whatsappLink = order.customerPhone
    ? `https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent('Hi ' + order.customerName + ', your order #' + order.orderId + ' has been received! Total: Rs.' + order.total)}`
    : null;

  async function generateInvoice() {
    setInvoiceLoading(true);
    const token = localStorage.getItem('ownerToken');
    try {
      const r = await fetch(`${API}/invoices/generate/${order._id}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      if (d.success) { setInvoiceUrl(d.invoice.pdfUrl); window.open(d.invoice.pdfUrl, '_blank'); }
    } finally { setInvoiceLoading(false); }
  }

  const REJECT_REASONS = ['Out of stock', 'Shop closed', 'Delivery not available', 'Customer request', 'Other'];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,0.3)' }} />
      {/* Panel */}
      <div style={{ width: 420, background: '#fff', display: 'flex', flexDirection: 'column', overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,0.1)' }}>
        {/* Panel header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Order #{order.orderId}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{timeAgo(order.createdAt)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.text }}>
              {STATUS_LABELS[order.orderStatus]}
            </span>
            <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#6b7280' }}>✕</button>
          </div>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Customer */}
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 8 }}>Customer</div>
            <div style={{ fontWeight: 600, color: '#111827' }}>{order.customerName}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{order.customerPhone}</div>
            {order.customerAddress && (
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                {order.customerAddress}
                {' · '}
                <a href={mapsLink} target="_blank" rel="noreferrer" style={{ color: '#f97316', fontWeight: 600 }}>Maps</a>
              </div>
            )}
          </div>

          {/* Items */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 8 }}>Items</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {order.items?.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f3f4f6', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.image
                      ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 18 }}>📦</span>
                    }
                  </div>
                  <div style={{ flex: 1, fontSize: 13, color: '#111827' }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>×{item.qty}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', minWidth: 50, textAlign: 'right' }}>₹{item.total}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bill */}
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
              <span>Subtotal</span><span>₹{order.subtotal}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
              <span>Delivery</span>
              <span style={{ color: order.deliveryCharge === 0 ? '#16a34a' : '#6b7280', fontWeight: order.deliveryCharge === 0 ? 600 : 400 }}>
                {order.deliveryCharge === 0 ? 'Free' : `₹${order.deliveryCharge}`}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: '#111827', paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
              <span>Total</span><span style={{ color: '#f97316' }}>₹{order.total}</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>
              {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod} · {CHANNEL_LABELS[order.channel] || order.channel}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 10, padding: 12, fontSize: 13, color: '#713f12' }}>
              📝 <strong>Note:</strong> {order.notes}
            </div>
          )}

          {/* Assign rider */}
          {['confirmed', 'packing'].includes(order.orderStatus) && riders.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 8 }}>Assign Rider</div>
              <select defaultValue={order.riderId?._id || order.riderId || ''}
                onChange={async e => { if (e.target.value) await onAssignRider(order._id, e.target.value); }}
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }}>
                <option value="">Select rider...</option>
                {riders.map(r => <option key={r._id} value={r._id}>{r.name} · {r.phone}</option>)}
              </select>
            </div>
          )}

          {/* Reject reasons */}
          {showRejectReasons && (
            <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#b91c1c', marginBottom: 8 }}>Select reject reason</div>
              {REJECT_REASONS.map(r => (
                <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', fontSize: 13 }}>
                  <input type="radio" name="reject" value={r} checked={rejectReason === r} onChange={() => setRejectReason(r)} />
                  {r}
                </label>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={() => { setShowRejectReasons(false); setRejectReason(''); }}
                  style={{ flex: 1, padding: '8px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                  Cancel
                </button>
                <button disabled={!rejectReason} onClick={() => { setShowRejectReasons(false); onStatusChange(order._id, 'cancelled', rejectReason); onClose(); }}
                  style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 8, background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: rejectReason ? 1 : 0.4 }}>
                  Confirm Reject
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {order.orderStatus === 'new' && !showRejectReasons && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { onStatusChange(order._id, 'confirmed'); onClose(); }}
                  style={{ flex: 1, padding: '12px', border: 'none', borderRadius: 10, background: '#22c55e', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  ✅ Accept Order
                </button>
                <button onClick={() => setShowRejectReasons(true)}
                  style={{ flex: 1, padding: '12px', border: 'none', borderRadius: 10, background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  ✕ Reject
                </button>
              </div>
            )}
            {order.orderStatus === 'confirmed' && (
              <button onClick={() => { onStatusChange(order._id, 'packing'); onClose(); }}
                style={{ padding: '12px', border: 'none', borderRadius: 10, background: '#f97316', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                📦 Start Packing
              </button>
            )}
            {order.orderStatus === 'packing' && (
              <button onClick={() => { onStatusChange(order._id, 'out_for_delivery'); onClose(); }}
                style={{ padding: '12px', border: 'none', borderRadius: 10, background: '#a855f7', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                🛵 Send for Delivery
              </button>
            )}
            {order.orderStatus === 'out_for_delivery' && (
              <button onClick={() => { onStatusChange(order._id, 'delivered'); onClose(); }}
                style={{ padding: '12px', border: 'none', borderRadius: 10, background: '#22c55e', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                ✅ Mark Delivered
              </button>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              {whatsappLink && (
                <a href={whatsappLink} target="_blank" rel="noreferrer"
                  style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, background: '#25D366', color: '#fff', fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none' }}>
                  💬 WhatsApp
                </a>
              )}
              {invoiceUrl ? (
                <a href={invoiceUrl} target="_blank" rel="noreferrer"
                  style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none' }}>
                  🧾 Download Invoice
                </a>
              ) : (
                <button onClick={generateInvoice} disabled={invoiceLoading}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  {invoiceLoading ? 'Generating...' : '🧾 Invoice'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// MAIN PAGE
export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const [newOrderIds, setNewOrderIds] = useState(new Set());
  const [selectedOrder, setSelectedOrder] = useState(null);

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('ownerToken') : null;
  const authHeaders = () => { const t = getToken(); return t ? { Authorization: `Bearer ${t}` } : {}; };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/orders?limit=100`, { headers: authHeaders(), credentials: 'include' });
      const data = await res.json();
      if (data.success) setOrders(data.orders);
    } catch (e) {}
    setLoading(false);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/analytics/summary`, { headers: authHeaders(), credentials: 'include' });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (e) {}
  }, []);

  const fetchRiders = useCallback(async () => {
    try {
      const res = await fetch(`${API}/riders`, { headers: authHeaders(), credentials: 'include' });
      const data = await res.json();
      if (data.success) setRiders(data.riders || []);
    } catch (e) {}
  }, []);

  useEffect(() => { fetchOrders(); fetchStats(); fetchRiders(); }, []);

  useEffect(() => {
    let socket;
    import('socket.io-client').then(({ io }) => {
      const shopInfo = JSON.parse(localStorage.getItem('shopInfo') || '{}');
      socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
      socket.on('connect', () => { if (shopInfo._id) socket.emit('join_shop', shopInfo._id); });
      socket.on('new_order', (newOrder) => {
        playPing();
        setOrders(prev => {
          const exists = prev.some(o => o._id === newOrder._id);
          return exists ? prev : [newOrder, ...prev];
        });
        setNewOrderIds(prev => new Set([...prev, newOrder._id]));
        setTimeout(() => setNewOrderIds(prev => { const n = new Set(prev); n.delete(newOrder._id); return n; }), 4000);
        fetchStats();
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`🛒 New Order #${newOrder.orderId}`, { body: `${newOrder.customerName} · ₹${newOrder.total}`, icon: '/favicon.ico' });
        }
      });
      socket.on('order_status_update', ({ orderId, orderStatus }) => {
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, orderStatus } : o));
      });
    });
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    return () => { if (socket) socket.disconnect(); };
  }, []);

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
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, riderId, orderStatus: 'out_for_delivery' } : o));
      fetchStats();
    } catch (e) {}
  };

  const displayedOrders = tab === 'all' ? orders : orders.filter(o => o.orderStatus === tab);
  const tabCounts = {};
  orders.forEach(o => { tabCounts[o.orderStatus] = (tabCounts[o.orderStatus] || 0) + 1; });

  return (
    <>
      <style>{`
        @keyframes orderFlash { 0% { background:#fff7ed } 50% { background:#ffedd5 } 100% { background:#fff7ed } }
        .new-order-row { animation: orderFlash 0.7s ease-in-out 4; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', width: '100%' }}>
        <Sidebar />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>

          {/* Header */}
          <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '18px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h1 style={{ margin: 0, fontWeight: 700, fontSize: 22, color: '#111827' }}>Orders</h1>
                <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>Real-time · live updates</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '5px 12px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }}></div>
                <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>Live</span>
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                  { label: "Today's Orders",  value: stats.todayOrders,    icon: '🛒' },
                  { label: "Today's Revenue", value: `₹${stats.todayRevenue}`, icon: '💰' },
                  { label: 'Pending',         value: stats.pendingOrders,  icon: '⏳', alert: stats.pendingOrders > 0 },
                  { label: 'Customers',       value: stats.totalCustomers, icon: '👥' },
                ].map(s => (
                  <div key={s.label} style={{ background: s.alert ? '#fff7ed' : '#f9fafb', border: `1px solid ${s.alert ? '#fed7aa' : '#f3f4f6'}`, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 20, color: s.alert ? '#ea580c' : '#111827' }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tab bar */}
          <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', minWidth: 'max-content' }}>
              {[{ key: 'all', label: 'All' }, ...STATUS_OPTIONS.map(s => ({ key: s, label: STATUS_LABELS[s] }))].map(({ key, label }) => {
                const count = key === 'all' ? orders.length : (tabCounts[key] || 0);
                const active = tab === key;
                return (
                  <button key={key} onClick={() => setTab(key)}
                    style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                      borderBottom: active ? '2px solid #111827' : '2px solid transparent',
                      color: active ? '#111827' : '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {label}
                    {count > 0 && (
                      <span style={{ background: key === 'new' && count > 0 ? '#f97316' : '#f3f4f6', color: key === 'new' && count > 0 ? '#fff' : '#374151',
                        borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div style={{ flex: 1, padding: '16px 24px', overflow: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>Loading orders...</div>
            ) : displayedOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🛒</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 6 }}>No orders yet</div>
                <div style={{ color: '#9ca3af', fontSize: 13 }}>New orders appear here instantly — no refresh needed</div>
              </div>
            ) : (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 }}>Order</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 }}>Date</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 }}>Customer</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 }}>Status</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 }}>Items</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 }}>Payment</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#374151', fontSize: 12 }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedOrders.map((order, i) => {
                      const sc = STATUS_COLORS[order.orderStatus] || STATUS_COLORS.new;
                      const isNew = newOrderIds.has(order._id);
                      return (
                        <tr key={order._id}
                          className={isNew ? 'new-order-row' : ''}
                          onClick={() => setSelectedOrder(order)}
                          style={{ borderBottom: i < displayedOrders.length - 1 ? '1px solid #f3f4f6' : 'none', cursor: 'pointer', background: '#fff' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 700, color: '#f97316' }}>#{order.orderId}</span>
                              {isNew && <span style={{ background: '#f97316', color: '#fff', borderRadius: 8, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>NEW</span>}
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', color: '#6b7280' }}>{timeAgo(order.createdAt)}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 500, color: '#111827' }}>{order.customerName}</div>
                            <div style={{ fontSize: 12, color: '#9ca3af' }}>{order.customerPhone}</div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: sc.bg, color: sc.text }}>
                              {STATUS_LABELS[order.orderStatus]}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', color: '#374151' }}>{order.items?.length || 0} items</td>
                          <td style={{ padding: '14px 16px', color: '#6b7280' }}>{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>₹{order.total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order detail panel */}
      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          riders={riders}
          onStatusChange={handleStatusChange}
          onAssignRider={handleAssignRider}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </>
  );
}
