'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

const STATUSES = [
  { key: 'new',              label: 'Order Placed',      icon: '📋', desc: 'Your order has been received' },
  { key: 'confirmed',        label: 'Confirmed',         icon: '✅', desc: 'Shop confirmed your order' },
  { key: 'packing',          label: 'Packing',           icon: '📦', desc: 'Your items are being packed' },
  { key: 'out_for_delivery', label: 'Out for Delivery',  icon: '🛵', desc: 'Rider is on the way to you' },
  { key: 'delivered',        label: 'Delivered',         icon: '🎉', desc: 'Order delivered successfully!' },
];

const STATUS_ORDER = STATUSES.map(s => s.key);

export default function TrackOrderPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentStatus, setCurrentStatus] = useState('new');
  const socketRef = useRef(null);

  useEffect(() => {
    // Load order
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

    // Real-time Socket.io updates
    let socket;
    import('socket.io-client').then(({ default: io }) => {
      socket = io(SOCKET_URL, { transports: ['websocket'] });
      socketRef.current = socket;
      socket.emit('join_order_room', orderId);
      socket.on('order_status_update', ({ orderStatus }) => {
        setCurrentStatus(orderStatus);
      });
    });

    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, [orderId]);

  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const isCancelled = currentStatus === 'cancelled';

  const callRider = () => {
    if (order?.riderId?.phone) window.open(`tel:${order.riderId.phone}`);
  };

  const whatsappShop = () => {
    if (order?.shopId) {
      window.open(`https://wa.me/?text=${encodeURIComponent(`Hi, I'd like to check on my order #${order.orderId}`)}`);
    }
  };

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

  const primary = '#FF6B35';

  return (
    <div className="min-h-screen bg-gray-50 pb-16">

      {/* Header */}
      <div className="text-white px-5 pt-10 pb-8" style={{ background: `linear-gradient(135deg, #1a1a2e, #2d2d44)` }}>
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Order Tracking</p>
        <h1 className="text-2xl font-bold">#{order.orderId}</h1>
        <p className="text-gray-400 text-sm mt-1">{order.customerName}</p>

        {/* Live status pill */}
        {!isCancelled ? (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
            style={{ backgroundColor: `${primary}30`, color: primary }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primary }}></span>
            {STATUSES.find(s => s.key === currentStatus)?.label || currentStatus}
          </div>
        ) : (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-red-500/20 text-red-400">
            ❌ Order Cancelled
          </div>
        )}
      </div>

      <div className="max-w-md mx-auto px-4 space-y-4 -mt-2">

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
                    {/* Icon + line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 transition-all duration-500 ${
                        done ? 'shadow-md' : 'bg-gray-100'
                      }`} style={done ? { backgroundColor: active ? primary : `${primary}20` } : {}}>
                        {active
                          ? <span className="animate-bounce">{step.icon}</span>
                          : done
                          ? <span>{step.icon}</span>
                          : <span className="text-gray-300 text-sm">○</span>
                        }
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 h-8 mt-1 transition-all duration-500 ${done && i < currentIdx ? '' : 'bg-gray-100'}`}
                          style={done && i < currentIdx ? { backgroundColor: primary } : {}}></div>
                      )}
                    </div>
                    {/* Text */}
                    <div className="pb-6">
                      <p className={`font-semibold text-sm ${done ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      {active && (
                        <p className="text-xs mt-0.5" style={{ color: primary }}>{step.desc}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rider info (shown when out for delivery) */}
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
              </div>
              <button
                onClick={callRider}
                className="w-11 h-11 rounded-full flex items-center justify-center text-white text-lg"
                style={{ backgroundColor: primary }}
              >
                📞
              </button>
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
          <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between font-bold">
            <span className="text-gray-900">Total</span>
            <span style={{ color: primary }}>₹{order.total}</span>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {order.paymentMethod === 'cod' ? '💵 Pay cash on delivery' :
             order.paymentMethod === 'pickup' ? '🏪 Pickup at shop' : '✅ Payment done'}
          </div>
        </div>

        {/* Delivery address */}
        {order.customerAddress && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3 items-start">
            <span className="text-xl mt-0.5">📍</span>
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Delivery Address</p>
              <p className="text-sm text-gray-700">{order.customerAddress}</p>
            </div>
          </div>
        )}

        {/* Leave a Review (shown only when delivered) */}
        {currentStatus === 'delivered' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <div className="text-2xl mb-1">⭐</div>
            <p className="text-sm font-bold text-gray-900 mb-1">Enjoy your order?</p>
            <p className="text-xs text-gray-400 mb-3">Your feedback helps the shop improve</p>
            <a href={`/review/${order._id}`}
              className="inline-block w-full py-3 rounded-xl text-white font-semibold text-sm"
              style={{ backgroundColor: '#FF6B35' }}>
              ⭐ Leave a Review
            </a>
          </div>
        )}

        {/* Help */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-bold text-gray-900 mb-3">Need Help?</p>
          <button
            onClick={whatsappShop}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
            style={{ backgroundColor: '#25D366' }}
          >
            💬 WhatsApp the Shop
          </button>
        </div>

      </div>
    </div>
  );
}
