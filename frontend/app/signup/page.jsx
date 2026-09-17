'use client';
import { API_URL } from '../../lib/config';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', ownerName: '', email: '', password: '',
    phone: '', city: '', category: 'grocery', country: 'India'
  });

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // send/receive cookies
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Signup failed. Please try again.');
        return;
      }

      // Save shop info to localStorage for quick access
      localStorage.setItem('souqly_shop', JSON.stringify(data.shop));
      router.push('/dashboard');
    } catch (err) {
      setError('Cannot connect to server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'grocery', label: 'ðŸ›’ Grocery' },
    { value: 'supermarket', label: 'ðŸª Supermarket' },
    { value: 'restaurant', label: 'ðŸ½ï¸ Restaurant' },
    { value: 'bakery', label: 'ðŸ¥– Bakery' },
    { value: 'pharmacy', label: 'ðŸ’Š Pharmacy' },
    { value: 'other', label: 'ðŸ¬ Other' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex">

      {/* Left side - branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-center px-16 text-white">
        <div className="mb-8">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
            <span className="text-3xl font-bold">S</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">Start selling online in 5 minutes</h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Join thousands of shop owners across India and GCC who use Souqly
            to manage orders, riders, and customers â€” all in one place.
          </p>
        </div>
        <div className="space-y-4">
          {['Free to start â€” no credit card needed', 'WhatsApp order notifications', 'GST invoices auto-generated', 'Rider delivery tracking'].map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm">âœ“</div>
              <span className="text-white/90">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right side - form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Create your store</h1>
          </div>

          <div className="lg:block hidden mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Create your store</h2>
            <p className="text-gray-500 mt-1">Free forever. Upgrade when you grow.</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm flex items-start gap-2">
              <span className="mt-0.5">âš ï¸</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Shop Name *</label>
                <input
                  value={form.name} onChange={set('name')}
                  placeholder="e.g. Fresh Mart, Star Bakery"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name *</label>
                <input
                  value={form.ownerName} onChange={set('ownerName')}
                  placeholder="Owner's full name"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone *</label>
                <input
                  value={form.phone} onChange={set('phone')}
                  placeholder="+91 98765 43210"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
                <input
                  value={form.city} onChange={set('city')}
                  placeholder="e.g. Kochi, Dubai"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setForm({ ...form, category: cat.value })}
                      className={`px-3 py-2.5 rounded-xl text-xs font-medium border-2 transition-all ${
                        form.category === cat.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                <input
                  type="email" value={form.email} onChange={set('email')}
                  placeholder="you@example.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                <input
                  type="password" value={form.password} onChange={set('password')}
                  placeholder="At least 6 characters"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  required minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Creating your store...
                </span>
              ) : 'Create Free Store â†’'}
            </button>

          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>

          <p className="text-center text-xs text-gray-400 mt-4">
            By signing up you agree to our Terms of Service.<br/>
            FaizeCart Online Services OPC Pvt Ltd Â· GSTIN: 32AAFCF7417G1ZU
          </p>
        </div>
      </div>
    </div>
  );
}


