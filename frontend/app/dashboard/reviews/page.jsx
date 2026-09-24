'use client';
import Sidebar from '../../../components/Sidebar';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

const Stars = ({ rating, size = 'text-sm' }) => (
  <span className={size}>
    {[1,2,3,4,5].map(s => <span key={s}>{s <= rating ? 'â­' : 'â˜†'}</span>)}
  </span>
);

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reviews').then(r => setReviews(r.data.reviews || [])).finally(() => setLoading(false));
  }, []);

  const handleToggle = async (review) => {
    try {
      const r = await api.put(`/reviews/${review._id}/visibility`);
      setReviews(prev => prev.map(rv => rv._id === review._id ? { ...rv, isVisible: r.data.isVisible } : rv));
      toast.success(r.data.isVisible ? 'Review visible' : 'Review hidden');
    } catch { toast.error('Failed'); }
  };

  const avg = reviews.filter(r => r.isVisible).length > 0
    ? (reviews.filter(r => r.isVisible).reduce((s, r) => s + r.rating, 0) / reviews.filter(r => r.isVisible).length).toFixed(1)
    : 0;

  const dist = [5,4,3,2,1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star && r.isVisible).length
  }));

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", width: "100%" }} style={{ background: "#080808" }}><Sidebar /><div className="flex-1 overflow-auto" style={{ background: "#080808" }}>
      <nav className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-primary">â† Dashboard</Link>
        <span className="text-gray-300">/</span>
        <span className="font-bold text-gray-900">Reviews</span>
      </nav>

      <div className="p-6 max-w-3xl space-y-6">

        {/* Rating Summary */}
        {reviews.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-5xl font-bold text-gray-900">{avg}</div>
                <Stars rating={Math.round(avg)} size="text-lg" />
                <div className="text-xs text-gray-400 mt-1">{reviews.filter(r => r.isVisible).length} reviews</div>
              </div>
              <div className="flex-1 space-y-1.5">
                {dist.map(({ star, count }) => {
                  const total = reviews.filter(r => r.isVisible).length;
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500 w-4">{star}</span>
                      <span className="text-yellow-400 text-xs">â˜…</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-yellow-400 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-gray-400 w-4">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Reviews List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-5xl mb-3">â­</div>
            <div className="font-semibold text-gray-700">No reviews yet</div>
            <div className="text-sm text-gray-400 mt-1">Reviews appear here after customers rate their delivered orders</div>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(review => (
              <div key={review._id} className={`bg-white rounded-2xl border p-5 ${!review.isVisible ? 'opacity-50' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {review.customerName[0]?.toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900 text-sm">{review.customerName}</span>
                        {review.orderId && (
                          <span className="text-xs text-gray-400 ml-2">Â· Order #{review.orderId.orderId}</span>
                        )}
                      </div>
                    </div>
                    <Stars rating={review.rating} />
                    {review.comment && (
                      <p className="text-sm text-gray-600 mt-2">{review.comment}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {!review.isVisible && <span className="ml-2 text-orange-500">Â· Hidden</span>}
                    </p>
                  </div>
                  <button onClick={() => handleToggle(review)}
                    className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:border-gray-300 flex-shrink-0">
                    {review.isVisible ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </div>
    </div>
  );
}
