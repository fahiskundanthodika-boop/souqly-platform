'use client';
import { API_URL } from '../../lib/config';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  { value: 'grocery',     label: 'Grocery' },
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'restaurant',  label: 'Restaurant' },
  { value: 'bakery',      label: 'Bakery' },
  { value: 'pharmacy',    label: 'Pharmacy' },
  { value: 'other',       label: 'Other' },
];

const PERKS = [
  'Free to start — no credit card needed',
  'WhatsApp order notifications',
  'GST invoices auto-generated',
  'Rider delivery tracking',
];

export default function SignupPage() {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [form,    setForm]    = useState({
    name: '', ownerName: '', email: '', password: '',
    phone: '', city: '', category: 'grocery', country: 'India',
  });

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Signup failed. Please try again.'); return; }
      localStorage.setItem('ownerToken',   data.token);
      localStorage.setItem('souqly_token', data.token);
      localStorage.setItem('souqly_shop',  JSON.stringify(data.shop));
      router.push('/dashboard');
    } catch { setError('Cannot connect to server. Please try again.'); }
    finally { setLoading(false); }
  };

  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 500, color: '#a0a0a0', marginBottom: 8 };

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', fontFamily: "'Inter', sans-serif" }}>

      {/* Left — branding */}
      <div style={{ display: 'none', width: '42%', background: '#0a0a0a', borderRight: '1px solid #1f1f1f', flexDirection: 'column', justifyContent: 'center', padding: '60px 56px', position: 'relative', overflow: 'hidden' }}
           className="signup-left">
        {/* Glow */}
        <div style={{ position: 'absolute', top: '30%', left: '20%', width: 400, height: 300, background: 'radial-gradient(ellipse, rgba(255,107,53,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
            <div style={{ width: 34, height: 34, background: '#FF6B35', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(255,107,53,0.4)' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>S</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: 17, color: '#fff' }}>Souqly</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.1, color: '#fff', marginBottom: 16 }}>
            Start selling online<br />in 5 minutes
          </h1>
          <p style={{ fontSize: 15, color: '#606060', lineHeight: 1.7, marginBottom: 40 }}>
            Join thousands of shop owners across India and GCC who use Souqly to manage orders, riders, and customers.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PERKS.map((perk, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 20, height: 20, background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <span style={{ fontSize: 13, color: '#a0a0a0' }}>{perk}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 24px', overflowY: 'auto',
        backgroundImage: 'linear-gradient(rgba(255,107,53,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,107,53,0.025) 1px,transparent 1px)',
        backgroundSize: '60px 60px',
      }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          {/* Mobile logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 32 }}>
            <Link href="/">
              <div style={{ width: 32, height: 32, background: '#FF6B35', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(255,107,53,0.35)' }}>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: 14 }}>S</span>
              </div>
            </Link>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>Create your store</h2>
              <p style={{ fontSize: 12, color: '#606060' }}>Free forever. Upgrade when you grow.</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Shop Name *</label>
                <input value={form.name} onChange={set('name')} placeholder="e.g. Fresh Mart, Star Bakery" className="inp" required />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Your Name *</label>
                <input value={form.ownerName} onChange={set('ownerName')} placeholder="Owner's full name" className="inp" required />
              </div>
              <div>
                <label style={labelStyle}>Phone *</label>
                <input value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" className="inp" required />
              </div>
              <div>
                <label style={labelStyle}>City *</label>
                <input value={form.city} onChange={set('city')} placeholder="e.g. Kochi, Dubai" className="inp" required />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Business Type *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value} type="button"
                      onClick={() => setForm({ ...form, category: cat.value })}
                      style={{
                        padding: '10px 8px', borderRadius: 9, fontSize: 13, fontWeight: 500,
                        cursor: 'pointer', fontFamily: "'Inter', sans-serif", transition: 'all 0.15s',
                        background: form.category === cat.value ? 'rgba(255,107,53,0.12)' : '#0f0f0f',
                        border: form.category === cat.value ? '1px solid rgba(255,107,53,0.4)' : '1px solid #1f1f1f',
                        color: form.category === cat.value ? '#FF6B35' : '#606060',
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Email *</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" className="inp" required />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Password *</label>
                <input type="password" value={form.password} onChange={set('password')} placeholder="At least 6 characters" className="inp" required minLength={6} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '13px 20px', fontSize: 14, marginTop: 4 }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                  Creating your store...
                </span>
              ) : 'Create Free Store →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#606060', marginTop: 20 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#FF6B35', fontWeight: 600 }}>Sign in</Link>
          </p>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#3a3a3a', marginTop: 12 }}>
            FaizeCart Online Services OPC Pvt. Ltd. &middot; GSTIN: 32AAFCF7417G1ZU
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 900px) { .signup-left { display: flex !important; } }
      `}</style>
    </div>
  );
}
