'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function StoreTrackPage() {
  const { shopSlug } = useParams();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const primary = '#FF6B35';

  async function handleTrack(e) {
    e.preventDefault();
    setError('');
    if (!phone.trim() || !orderId.trim()) {
      setError('Please enter your phone number and order number.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/orders/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), orderId: orderId.trim(), shopSlug })
      });
      const data = await res.json();
      if (data.success && data.order?._id) {
        router.push(`/track/${data.order._id}`);
      } else {
        setError(data.message || 'Order not found. Check your phone number and order number.');
      }
    } catch {
      setError('Could not connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-sm">

        {/* Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4"
            style={{ background: `linear-gradient(135deg, ${primary}20, ${primary}10)` }}>
            📍
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Track Your Order</h1>
          <p className="text-gray-500 text-sm mt-2">Enter your details to see live order status</p>
        </div>

        {/* Form */}
        <form onSubmit={handleTrack} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 bg-white"
              style={{ fontSize: 16 }}
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Order Number
            </label>
            <input
              type="number"
              value={orderId}
              onChange={e => setOrderId(e.target.value)}
              placeholder="e.g. 1042"
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 bg-white"
              style={{ fontSize: 16 }}
              inputMode="numeric"
            />
            <p className="text-xs text-gray-400 mt-1.5">Found in your SMS/WhatsApp confirmation</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl text-sm font-medium text-red-700 bg-red-50 border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 transition-opacity"
            style={{ backgroundColor: primary, opacity: loading ? 0.7 : 1 }}>
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Searching...
              </>
            ) : (
              <>📦 Track Order</>
            )}
          </button>
        </form>

        {/* Help */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            Order number is in your confirmation message.
            <br />Having trouble?{' '}
            <a href={`/store/${shopSlug}`} style={{ color: primary }} className="font-semibold">
              Back to shop
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
