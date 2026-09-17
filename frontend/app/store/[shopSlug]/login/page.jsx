'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { API_URL as API } from '../../../../lib/config';

export default function CustomerLoginPage() {
  const { shopSlug } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || `/store/${shopSlug}/account`;

  const [shop, setShop] = useState(null);
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const primary = shop?.primaryColor || '#FF6B35';

  useEffect(() => {
    fetch(`${API}/shop/public/${shopSlug}`)
      .then(r => r.json())
      .then(d => { if (d.success) setShop(d.shop); });
  }, [shopSlug]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!phone.trim()) { setError('Enter your phone number'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/customer/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), shopId: shop._id })
      });
      const data = await res.json();
      if (!data.success) { setError(data.message); return; }
      if (data.otp) setDevOtp(data.otp); // dev mode: show OTP on screen
      setStep('otp');
    } catch {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp.trim()) { setError('Enter the OTP'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/customer/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), shopId: shop._id, otp: otp.trim() })
      });
      const data = await res.json();
      if (!data.success) { setError(data.message); return; }
      localStorage.setItem(`customer_token_${shopSlug}`, data.token);
      localStorage.setItem(`customer_${shopSlug}`, JSON.stringify(data.customer));
      router.push(redirect);
    } catch {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  if (!shop) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: '#FF6B3540', borderTopColor: '#FF6B35' }} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600">←</button>
        <div>
          <h1 className="font-bold text-gray-900">My Account</h1>
          <p className="text-xs text-gray-400">{shop.name}</p>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">

          <div className="text-center mb-8">
            <div className="text-5xl mb-3">👤</div>
            <h2 className="text-xl font-bold text-gray-900">
              {step === 'phone' ? 'Login to your account' : 'Enter OTP'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === 'phone'
                ? 'Enter the phone number you use for orders'
                : `OTP sent to ${phone}`}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm mb-4 flex gap-2">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          {/* Dev mode OTP hint */}
          {devOtp && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-2xl px-4 py-3 text-sm mb-4 text-center">
              <div className="font-semibold">Dev Mode — Your OTP:</div>
              <div className="text-2xl font-bold tracking-widest mt-1">{devOtp}</div>
              <div className="text-xs mt-1 text-yellow-600">(WhatsApp OTP when Meta is configured)</div>
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full border border-gray-200 rounded-2xl px-4 py-4 text-lg font-semibold focus:outline-none focus:ring-2 text-center tracking-widest"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-60"
                style={{ backgroundColor: primary }}
              >
                {loading ? 'Sending OTP...' : 'Send OTP →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  4-Digit OTP
                </label>
                <input
                  type="number"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  placeholder="- - - -"
                  maxLength={4}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-4 text-2xl font-bold focus:outline-none focus:ring-2 text-center tracking-widest"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-60"
                style={{ backgroundColor: primary }}
              >
                {loading ? 'Verifying...' : 'Verify & Login →'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); setDevOtp(''); setError(''); }}
                className="w-full py-3 text-sm text-gray-500 hover:text-gray-700"
              >
                ← Change phone number
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
