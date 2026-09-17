'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { API_URL as API } from '../../../lib/config';

export default function ReviewPage() {
  const { orderId } = useParams();
  const router = useRouter();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`${API}/orders/track/${orderId}`).then(r => r.json()),
      fetch(`${API}/reviews/check/${orderId}`).then(r => r.json())
    ]).then(([orderData, reviewData]) => {
      if (orderData.success) setOrder(orderData.order);
      if (reviewData.reviewed) setAlreadyReviewed(true);
    }).finally(() => setLoading(false));
  }, [orderId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { setError('Please select a star rating'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          rating,
          comment,
          customerName: order.customerName,
          customerPhone: order.customerPhone
        })
      });
      const data = await res.json();
      if (!data.success) { setError(data.message); return; }
      setDone(true);
    } catch {
      setError('Could not submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6B3540', borderTopColor: '#FF6B35' }} />
    </div>
  );

  if (!order) return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <div className="text-5xl mb-3">❌</div>
        <div className="font-semibold text-gray-700">Order not found</div>
      </div>
    </div>
  );

  if (order.orderStatus !== 'delivered') return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <div className="text-5xl mb-3">⏳</div>
        <div className="font-bold text-gray-900 text-lg">Order not delivered yet</div>
        <div className="text-sm text-gray-500 mt-2">You can review your order once it's delivered.</div>
        <Link href={`/track/${orderId}`} className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold">
          Track Order
        </Link>
      </div>
    </div>
  );

  if (alreadyReviewed || done) return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <div className="text-6xl mb-4">{done ? '🎉' : '✅'}</div>
        <div className="font-bold text-gray-900 text-xl mb-2">
          {done ? 'Thank you for your review!' : 'Already reviewed'}
        </div>
        <div className="text-sm text-gray-500 mb-6">
          {done ? 'Your feedback helps other customers.' : 'You have already submitted a review for this order.'}
        </div>
        <div className="flex gap-3 justify-center">
          {'⭐'.repeat(rating || 5)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-4 py-4">
        <h1 className="font-bold text-gray-900 text-center">Rate Your Order</h1>
        <p className="text-xs text-gray-400 text-center mt-0.5">Order #{order.orderId}</p>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">

          {/* Order summary */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
            <div className="text-sm font-semibold text-gray-900 mb-2">Your order from {order.shopId?.name || 'the shop'}</div>
            <div className="space-y-1">
              {order.items?.slice(0, 3).map((item, i) => (
                <div key={i} className="text-xs text-gray-500">{item.qty}× {item.name}</div>
              ))}
              {order.items?.length > 3 && <div className="text-xs text-gray-400">+{order.items.length - 3} more items</div>}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Star Rating */}
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-700 mb-3">How was your experience?</div>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    className="text-4xl transition-transform hover:scale-110 active:scale-95">
                    {star <= (hovered || rating) ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <div className="text-sm text-gray-500 mt-2">
                  {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
                </div>
              )}
            </div>

            {/* Comment */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Your Comment <span className="text-gray-300 font-normal">(optional)</span>
              </label>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Tell us about your experience — food quality, delivery speed, packaging..."
                rows={4} maxLength={500}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 resize-none" />
              <div className="text-xs text-gray-400 text-right mt-1">{comment.length}/500</div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={submitting || rating === 0}
              className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-60 bg-primary">
              {submitting ? 'Submitting...' : 'Submit Review →'}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
