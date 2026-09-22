'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

const STATUSES = [
  { key: 'new',              label: 'Order Placed',      icon: '📋', desc: 'Your order has been received', eta: 0 },
  { key: 'confirmed',        label: 'Confirmed',         icon: '✅', desc: 'Shop confirmed your order',    eta: 5 },
  { key: 'packing',          label: 'Being Packed',      icon: '📦', desc: 'Your items are being packed',  eta: 15 },
  { key: 'out_for_delivery', label: 'Out for Delivery',  icon: '🛵', desc: 'Rider is on the way to you',  eta: 25 },
  { key: 'delivered',        label: 'Delivered',         icon: '🎉', desc: 'Order delivered successfully!', eta: 0 },
];

const STATUS_ORDER = STATUSES.map(s => s.key);

function ETACountdown({ minutes }) {
  const [secs, setSecs] = useState(minutes * 60);
  useEffect(() => {
    if (secs <= 0) return;
    const t = setInterval(() => setSecs(s => s - 1), 1000);
    return () => clearInterval(t);
  }, []);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (secs <= 0) return <span>Any moment now...</span>;
  return <span>~{m}m {s.toString().padStart(2, '0')}s</span>;
}

export default function TrackOrderPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentStatus, setCurrentStatus] = useState('new');
  const [copied, setCopied] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/orders/track/${orderId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setOrder(data.order);
          setCurrentStatus(data.order.orderStatus);
        } else {
          setError('Order not found.');
        }
      })
      .catch(() => setError('Could not load order. Please try again.'))
      .finally(() => setLoading(false));

    // Real-time updates
    let socket;
    import('socket.io-client').then(({ default: io }) => {
      socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
      socketRef.current = socket;
      socket.on('connect', () => {
        socket.emit('join_order_room', orderId);
        socket.emit('track_order', orderId);
      });
      socket.on('order_status_update', ({ orderStatus }) => {
        setCurrentStatus(orderStatus);
      });
    });

    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, [orderId]);

  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const isCancelled = currentStatus === 'cancelled';
  const isDelivered = currentStatus === 'delivered';
  const currentStep = STATUSES.find(s => s.key === currentStatus);
  const etaMinutes = currentStep?.eta || 0;
  const primary = '#FF6B35';

  const trackingUrl = typeof window !== 'undefined' ? window.location.href : '';

  function copyLink() {
    navigator.clipboard.writeText(trackingUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareWhatsApp() {
    const msg = `Track my order #${order?.orderId} here:\n${trackingUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-bounce">📍</div>
        <p className="text-gray-500">Loading your order...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="text-center">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    </div>
  );

  const shop = order.shopId || {};

  return (
    <div className="min-h-screen bg-gray-50 pb-16">

      {/* Header */}
      <div className="text-white px-5 pt-10 pb-8" style={{ background: `linear-gradient(135deg, #1a1a2e, #2d2d44)` }}>
        {/* Shop branding */}
        <div className="flex items-center gap-3 mb-5">
          {shop.logo
            ? <img src={shop.logo} alt={shop.name} className="w-10 h-10 rounded-xl object-cover" />
            : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: primary }}>🛍️</div>
          }
          <div>
            <div className="font-bold text-white">{shop.name || 'Your Shop'}</div>
            <div className="text-gray-400 text-xs">{shop.city || ''}</div>
          </div>
        </div>

        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Order Tracking</p>
        <h1 className="text-3xl font-bold">#{order.orderId}</h1>
        <p className="text-gray-400 text-sm mt-1">{order.customerName} · {order.customerPhone}</p>

        {/* Live status pill */}
        {!isCancelled ? (
          <div className="mt-4 flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
              style={{ backgroundColor: `${primary}30`, color: primary }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primary }}></span>
              {currentStep?.label || currentStatus}
            </div>
            {!isDelivered && etaMinutes > 0 && (
              <div className="text-sm text-gray-300 font-mono">
                <ETACountdown minutes={etaMinutes} />
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-red-500/20 text-red-400">
            ❌ Order Cancelled
          </div>
        )}
      </div>

      <div className="max-w-md mx-auto px-4 space-y-4 mt-4">

        {/* Progress Timeline */}
        {!isCancelled && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-bold text-gray-900 mb-5 text-sm uppercase tracking-wide">Order Progress</h2>
            <div className="space-y-0">
              {STATUSES.map((step, i) => {
                const done = i <= currentIdx;
                const active = i === currentIdx;
                const isLast = i === STATUSES.length - 1;
                return (
                  <div key={step.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 transition-all duration-500"
                        style={{
                          backgroundColor: done ? (active ? primary : `${primary}20`) : '#f3f4f6',
                          boxShadow: active ? `0 0 0 4px ${primary}25` : 'none'
                        }}>
                        {active
                          ? <span className="animate-bounce">{step.icon}</span>
                          : done ? <span>{step.icon}</span>
                          : <span className="text-gray-300 text-sm">○</span>
                        }
                      </div>
                      {!isLast && (
                        <div className="w-0.5 h-8 mt-1 transition-all duration-700"
                          style={{ backgroundColor: done && i < currentIdx ? primary : '#e5e7eb' }}>
                        </div>
                      )}
                    </div>
                    <div className="pb-6 pt-1">
                      <p className={`font-semibold text-sm ${done ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      {active && (
                        <p className="text-xs mt-0.5" style={{ color: primary }}>{step.desc}</p>
                      )}
                      {done && !active && i < currentIdx && (
                        <p className="text-xs mt-0.5 text-gray-400">Done ✓</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Delivered celebration */}
        {isDelivered && (
          <div className="rounded-2xl p-5 text-center"
            style={{ background: `linear-gradient(135deg, ${primary}15, ${primary}05)`, border: `1px solid ${primary}30` }}>
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="font-bold text-gray-900 text-lg mb-1">Order Delivered!</h2>
            <p className="text-sm text-gray-500">Enjoy your order, {order.customerName}!</p>
          </div>
        )}

        {/* Rider info */}
        {currentStatus === 'out_for_delivery' && order.riderId && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Your Rider</h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${primary}15` }}>
                🛵
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{order.riderId.name}</p>
                <p className="text-sm text-gray-500">{order.riderId.vehicleType || 'Bike'} · On the way</p>
                {order.riderId.phone && (
                  <p className="text-xs mt-0.5" style={{ color: primary }}>{order.riderId.phone}</p>
                )}
              </div>
              {order.riderId.phone && (
                <a href={`tel:${order.riderId.phone}`}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white text-lg flex-shrink-0"
                  style={{ backgroundColor: primary }}>
                  📞
                </a>
              )}
            </div>
          </div>
        )}

        {/* Order summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Order Summary</h2>
          <div className="space-y-2">
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.name} × {item.qty}</span>
                <span className="font-medium text-gray-900">₹{item.total}</span>
              </div>
            ))}
          </div>
          {order.deliveryCharge > 0 && (
            <div className="flex justify-between text-sm mt-2 text-gray-400">
              <span>Delivery</span>
              <span>₹{order.deliveryCharge}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between text-sm mt-1 text-green-600">
              <span>Discount</span>
              <span>-₹{order.discount}</span>
            </div>
          )}
          <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between font-bold">
            <span className="text-gray-900">Total</span>
            <span style={{ color: primary }}>₹{order.total}</span>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {order.paymentMethod === 'cod' ? '💵 Pay cash on delivery'
            : order.paymentMethod === 'pickup' ? '🏪 Pickup at shop'
            : '✅ Payment done'}
          </div>
        </div>

        {/* Delivery address */}
        {order.customerAddress && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3 items-start">
            <span className="text-xl mt-0.5">📍</span>
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Delivery Address</p>
              <p className="text-sm text-gray-700">{order.customerAddress}</p>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(order.customerAddress)}`}
                target="_blank" rel="noreferrer"
                className="text-xs font-semibold mt-1 inline-block" style={{ color: primary }}>
                Open in Maps →
              </a>
            </div>
          </div>
        )}

        {/* Share tracking link */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-bold text-gray-900 mb-3">Share Tracking Link</p>
          <div className="flex gap-2">
            <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-xs text-gray-500 truncate font-mono">
              {trackingUrl.replace('https://', '')}
            </div>
            <button onClick={copyLink}
              className="px-3 py-2.5 rounded-xl text-white font-semibold text-xs flex-shrink-0"
              style={{ backgroundColor: copied ? '#16a34a' : primary }}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <button onClick={shareWhatsApp}
            className="mt-2 w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
            style={{ backgroundColor: '#25D366' }}>
            💬 Share on WhatsApp
          </button>
        </div>

        {/* Review prompt */}
        {isDelivered && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <div className="text-2xl mb-1">⭐</div>
            <p className="text-sm font-bold text-gray-900 mb-1">Enjoy your order?</p>
            <p className="text-xs text-gray-400 mb-3">Your feedback helps the shop improve</p>
            <a href={`/review/${order._id}`}
              className="inline-block w-full py-3 rounded-xl text-white font-semibold text-sm"
              style={{ backgroundColor: primary }}>
              ⭐ Leave a Review
            </a>
          </div>
        )}

        {/* Contact shop */}
        {shop.whatsappNumber || shop.phone ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-sm font-bold text-gray-900 mb-3">Need Help?</p>
            <div className="flex gap-2">
              {shop.whatsappNumber && (
                <a href={`https://wa.me/${shop.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I'd like to check on my order #${order.orderId}`)}`}
                  target="_blank" rel="noreferrer"
                  className="flex-1 py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-1"
                  style={{ backgroundColor: '#25D366' }}>
                  💬 WhatsApp
                </a>
              )}
              {shop.phone && (
                <a href={`tel:${shop.phone}`}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1 border-2"
                  style={{ borderColor: primary, color: primary }}>
                  📞 Call Shop
                </a>
              )}
            </div>
          </div>
        ) : null}

      </div>
    </div>
  );
}
