'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function BillingVerifyPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState('verifying'); // verifying | success | failed | pending
  const [message, setMessage] = useState('');
  const [plan, setPlan] = useState('');

  useEffect(() => {
    const orderId = params.get('orderId');
    const planId = params.get('plan');
    if (!orderId || !planId) { setStatus('failed'); setMessage('Invalid payment link.'); return; }

    setPlan(planId);
    const token = localStorage.getItem('ownerToken');

    fetch(`${API}/subscription/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ merchantOrderId: orderId, plan: planId })
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setStatus('success');
          setMessage(d.message);
          // Update local shop data
          try {
            const shop = JSON.parse(localStorage.getItem('souqly_shop') || '{}');
            shop.plan = planId;
            localStorage.setItem('souqly_shop', JSON.stringify(shop));
          } catch {}
        } else if (d.state === 'PENDING') {
          setStatus('pending');
          setMessage(d.message);
        } else {
          setStatus('failed');
          setMessage(d.message || 'Payment could not be confirmed.');
        }
      })
      .catch(() => { setStatus('failed'); setMessage('Verification failed. Please contact support.'); });
  }, []);

  const planLabels = { starter: 'Starter', growth: 'Growth', business: 'Business' };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 420, width: '100%', background: '#fff', borderRadius: 20, padding: 48, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        {status === 'verifying' && (
          <>
            <div style={{ width: 56, height: 56, border: '5px solid #FF6B35', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 24px' }} />
            <h2 style={{ margin: '0 0 8px' }}>Verifying Payment</h2>
            <p style={{ color: '#888', margin: 0 }}>Please wait while we confirm your payment with PhonePe...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2 style={{ margin: '0 0 8px', color: '#16a34a' }}>Payment Successful!</h2>
            <p style={{ color: '#555', marginBottom: 24 }}>Your <strong>{planLabels[plan] || plan}</strong> plan is now active.</p>
            <button onClick={() => router.push('/dashboard')}
              style={{ background: '#FF6B35', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer', width: '100%' }}>
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'pending' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 16 }}>⏳</div>
            <h2 style={{ margin: '0 0 8px', color: '#d97706' }}>Payment Pending</h2>
            <p style={{ color: '#555', marginBottom: 24 }}>{message}</p>
            <button onClick={() => router.push('/dashboard/billing')}
              style={{ background: '#f5f5f5', border: 'none', borderRadius: 10, padding: '12px 32px', fontWeight: 600, fontSize: 15, cursor: 'pointer', width: '100%' }}>
              Back to Billing
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 16 }}>❌</div>
            <h2 style={{ margin: '0 0 8px', color: '#dc2626' }}>Payment Failed</h2>
            <p style={{ color: '#555', marginBottom: 24 }}>{message}</p>
            <button onClick={() => router.push('/dashboard/billing')}
              style={{ background: '#FF6B35', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer', width: '100%' }}>
              Try Again
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
