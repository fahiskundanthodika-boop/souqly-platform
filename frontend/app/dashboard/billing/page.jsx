'use client';
import Sidebar from '../../../components/Sidebar';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    color: '#6b7280',
    badge: null,
    features: ['1 Branch', '50 Products', '100 Orders/month', 'Basic Analytics', 'COD only'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 999,
    color: '#3b82f6',
    badge: 'Popular',
    features: ['1 Branch', '500 Products', 'Unlimited Orders', 'WhatsApp Notifications', 'Loyalty Points', 'Custom Theme'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 2499,
    color: '#FF6B35',
    badge: 'Best Value',
    features: ['3 Branches', 'Unlimited Products', 'WhatsApp Marketing', 'GST Invoices', 'Rider App', 'SMS Notifications', 'Coupon System'],
  },
  {
    id: 'business',
    name: 'Business',
    price: 4999,
    color: '#7c3aed',
    badge: null,
    features: ['10 Branches', 'Everything in Growth', 'API Access', 'Priority Support', 'Custom Domain', 'Dedicated Account Manager'],
  },
];

export default function BillingPage() {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState('free');
  const [expiresAt, setExpiresAt] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [msg, setMsg] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('ownerToken') : null;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      fetch(`${API}/subscription/my`, { headers }).then(r => r.json()),
      fetch(`${API}/subscription/history`, { headers }).then(r => r.json()),
    ]).then(([sub, hist]) => {
      if (sub.success) { setCurrentPlan(sub.currentPlan || 'free'); setExpiresAt(sub.planExpiresAt); }
      if (hist.success) setHistory(hist.history);
    }).finally(() => setLoading(false));
  }, []);

  async function upgrade(planId) {
    if (planId === 'free') {
      if (!confirm('Downgrade to Free plan? You will lose access to paid features immediately.')) return;
      const r = await fetch(`${API}/subscription/downgrade`, { method: 'POST', headers });
      const d = await r.json();
      if (d.success) { setCurrentPlan('free'); setExpiresAt(null); setMsg('Downgraded to Free plan.'); }
      else setMsg(d.message);
      return;
    }

    setPaying(planId);
    setMsg('');
    try {
      const r = await fetch(`${API}/subscription/initiate`, {
        method: 'POST', headers, body: JSON.stringify({ plan: planId })
      });
      const d = await r.json();
      if (d.success && d.redirectUrl) {
        // Redirect to PhonePe checkout
        window.location.href = d.redirectUrl;
      } else {
        setMsg(d.message || 'Could not start payment. Check PhonePe credentials.');
      }
    } catch {
      setMsg('Payment initiation failed. Please try again.');
    } finally {
      setPaying(null);
    }
  }

  const planInfo = PLANS.find(p => p.id === currentPlan);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '4px solid #FF6B35', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#999' }}>Loading billing info...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex"><Sidebar /><div className="flex-1 overflow-auto p-6" style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 6px' }}>Billing & Subscription</h1>
        <p style={{ margin: 0, color: '#666', fontSize: 14 }}>Choose the plan that fits your business</p>
      </div>

      {msg && (
        <div style={{ padding: '12px 16px', background: msg.includes('failed') || msg.includes('error') ? '#fef2f2' : '#f0fdf4', border: `1px solid ${msg.includes('failed') || msg.includes('error') ? '#fecaca' : '#bbf7d0'}`, borderRadius: 8, marginBottom: 24, color: msg.includes('failed') || msg.includes('error') ? '#dc2626' : '#16a34a', fontWeight: 500 }}>
          {msg}
        </div>
      )}

      {/* Current Plan Banner */}
      <div style={{ background: `linear-gradient(135deg, ${planInfo?.color}15, ${planInfo?.color}08)`, border: `1px solid ${planInfo?.color}40`, borderRadius: 12, padding: '20px 24px', marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 13, color: '#666' }}>Current Plan</p>
          <h2 style={{ margin: '0 0 4px', color: planInfo?.color }}>{planInfo?.name} Plan</h2>
          {expiresAt && <p style={{ margin: 0, fontSize: 13, color: '#888' }}>Renews on {new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
          {!expiresAt && currentPlan === 'free' && <p style={{ margin: 0, fontSize: 13, color: '#888' }}>No billing — upgrade anytime</p>}
        </div>
        {currentPlan !== 'free' && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 700, color: planInfo?.color }}>₹{planInfo?.price}<span style={{ fontSize: 13, fontWeight: 400 }}>/mo</span></p>
          </div>
        )}
      </div>

      {/* Plan Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 40 }}>
        {PLANS.map(plan => {
          const isCurrent = plan.id === currentPlan;
          const isDowngrade = PLANS.findIndex(p => p.id === plan.id) < PLANS.findIndex(p => p.id === currentPlan);
          return (
            <div key={plan.id} style={{ background: '#fff', border: `2px solid ${isCurrent ? plan.color : '#e5e7eb'}`, borderRadius: 16, padding: 24, position: 'relative', transition: 'border-color 0.2s' }}>
              {plan.badge && (
                <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 20 }}>
                  {plan.badge}
                </span>
              )}
              {isCurrent && (
                <span style={{ position: 'absolute', top: 12, right: 12, background: plan.color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12 }}>
                  ACTIVE
                </span>
              )}
              <h3 style={{ margin: '0 0 4px', color: plan.color, fontSize: 18 }}>{plan.name}</h3>
              <p style={{ margin: '0 0 16px', fontSize: 24, fontWeight: 700 }}>
                {plan.price === 0 ? 'Free' : <>₹{plan.price.toLocaleString('en-IN')}<span style={{ fontSize: 13, fontWeight: 400, color: '#888' }}>/mo</span></>}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', fontSize: 13 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ padding: '3px 0', color: '#555', display: 'flex', gap: 8 }}>
                    <span style={{ color: plan.color }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => upgrade(plan.id)}
                disabled={isCurrent || paying === plan.id}
                style={{
                  width: '100%',
                  padding: '10px 0',
                  borderRadius: 8,
                  border: isCurrent ? 'none' : `2px solid ${plan.color}`,
                  background: isCurrent ? '#f3f4f6' : paying === plan.id ? '#e5e7eb' : plan.color,
                  color: isCurrent ? '#9ca3af' : '#fff',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: isCurrent ? 'default' : 'pointer',
                  transition: 'opacity 0.2s',
                }}
              >
                {isCurrent ? 'Current Plan'
                  : paying === plan.id ? 'Processing...'
                  : isDowngrade ? 'Downgrade'
                  : plan.price === 0 ? 'Switch to Free'
                  : 'Upgrade — Pay with PhonePe'}
              </button>
            </div>
          );
        })}
      </div>

      {/* PhonePe badge */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <p style={{ color: '#888', fontSize: 13 }}>
          🔒 Secure payments powered by <strong style={{ color: '#5f259f' }}>PhonePe</strong> · UPI · Cards · Net Banking
        </p>
      </div>

      {/* Payment History */}
      {history.length > 0 && (
        <div>
          <h3 style={{ marginBottom: 16 }}>Payment History</h3>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Date', 'Plan', 'Amount', 'Gateway', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={h._id} style={{ borderBottom: i < history.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>{new Date(h.createdAt).toLocaleDateString('en-IN')}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, textTransform: 'capitalize' }}>{h.plan}</td>
                    <td style={{ padding: '12px 16px' }}>₹{h.amount?.toLocaleString('en-IN') || 0}</td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{h.gateway || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: h.status === 'active' ? '#dcfce7' : '#fef3c7', color: h.status === 'active' ? '#16a34a' : '#d97706', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div></div>
  );
}
