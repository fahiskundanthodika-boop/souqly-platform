'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const PAYMENT_LABELS = {
  cod: '💵 Cash on Delivery',
  card_on_delivery: '💳 Card on Delivery',
  pickup: '🏪 Pickup at Shop',
  bank_transfer: '🏦 Bank Transfer',
  online: '🌐 Online Payment'
};

export default function ConfirmationPage() {
  const { shopSlug } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [order, setOrder] = useState(null);
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    const saved = localStorage.getItem(`last_order_${shopSlug}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setOrder(parsed);
      } catch (e) {}
    }
  }, [shopSlug]);

  // Share on WhatsApp
  const shareWhatsApp = () => {
    if (!order) return;
    const itemsText = order.items
      .map(i => `• ${i.name} x${i.qty} — ₹${i.total}`)
      .join('\n');

    const msg = `🛍️ *Order Confirmed!*\n\nOrder: *${order.orderId}*\nShop: ${order.shopName || shopSlug}\n\n${itemsText}\n\n💰 Total: ₹${order.total}\n💳 Payment: ${PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}\n\nThank you for your order!`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl mb-4">🧾</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No order found</h2>
        <p className="text-gray-400 text-sm mb-6">We couldn't find your order details.</p>
        <Link href={`/store/${shopSlug}`}
          className="px-6 py-3 rounded-2xl text-white font-bold text-sm bg-orange-500">
          Go back to store
        </Link>
      </div>
    );
  }

  const primary = '#FF6B35';

  return (
    <div className="min-h-screen bg-gray-50 pb-16">

      {/* Success header */}
      <div className="text-center pt-10 pb-8 px-6"
        style={{ background: `linear-gradient(135deg, ${primary}15, ${primary}05)` }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl"
          style={{ backgroundColor: `${primary}20` }}>
          ✅
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Order Placed!</h1>
        <p className="text-gray-500 text-sm">Thank you, {order.customerName}!</p>

        <div className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white font-bold text-lg"
          style={{ backgroundColor: primary }}>
          {order.orderId}
        </div>
        <p className="text-xs text-gray-400 mt-1">Your order number</p>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-4">

        {/* Estimated time */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
          <div className="text-3xl">⏱️</div>
          <div>
            <div className="font-bold text-gray-900">Estimated Delivery</div>
            <div className="text-sm text-gray-500">
              {order.paymentMethod === 'pickup'
                ? 'Ready for pickup shortly — we will call you!'
                : '30 – 45 minutes (may vary based on location)'
              }
            </div>
          </div>
        </div>

        {/* Items ordered */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 mb-3">Items Ordered</h2>
          <div className="space-y-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                  {item.image
                    ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-lg">🛍️</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                  <div className="text-xs text-gray-400">₹{item.price} × {item.qty}</div>
                </div>
                <div className="font-semibold text-sm text-gray-900">₹{item.total}</div>
              </div>
            ))}
          </div>

          {/* Bill */}
          <div className="border-t border-gray-100 mt-4 pt-3 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>₹{order.subtotal}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Delivery</span>
              <span className={order.deliveryCharge === 0 ? 'text-green-600' : ''}>
                {order.deliveryCharge === 0
                  ? order.paymentMethod === 'pickup' ? 'Pickup (Free)' : 'FREE'
                  : `₹${order.deliveryCharge}`
                }
              </span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
              <span>Total Paid</span>
              <span style={{ color: primary }}>₹{order.total}</span>
            </div>
          </div>
        </div>

        {/* Payment method */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="text-2xl">💳</div>
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Payment Method</div>
            <div className="font-semibold text-gray-900 mt-0.5">
              {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
            </div>
          </div>
        </div>

        {/* What's next */}
        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
          <div className="font-bold text-blue-900 mb-2 text-sm">📲 What happens next?</div>
          <ul className="text-xs text-blue-700 space-y-1.5">
            <li>• The shop owner receives your order instantly</li>
            <li>• You will get a call or message to confirm</li>
            {order.paymentMethod === 'cod' && <li>• Keep cash ready when the rider arrives</li>}
            {order.paymentMethod === 'bank_transfer' && <li>• Transfer payment to the UPI ID shared by the shop</li>}
            {order.paymentMethod === 'pickup' && <li>• Visit the shop to collect your order</li>}
          </ul>
        </div>

        {/* Action buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={shareWhatsApp}
            className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2"
            style={{ backgroundColor: '#25D366' }}
          >
            <span className="text-xl">📲</span> Share Order on WhatsApp
          </button>

          <Link href={`/track/${order._id}`}
            className="block w-full py-4 rounded-2xl text-center font-bold text-base text-white"
            style={{ backgroundColor: primary }}>
            📍 Track My Order
          </Link>

          <Link href={`/store/${shopSlug}`}
            className="block w-full py-4 rounded-2xl text-center font-bold text-base border-2"
            style={{ borderColor: primary, color: primary }}>
            🛍️ Order Again
          </Link>
        </div>

      </div>
    </div>
  );
}
