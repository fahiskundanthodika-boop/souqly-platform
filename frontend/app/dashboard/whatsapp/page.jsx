'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../components/Sidebar';
import { API_URL } from '../../../lib/config';

const S = {
  bg:      '#080808',
  surface: '#0f0f0f',
  s2:      '#161616',
  border:  '#1f1f1f',
  orange:  '#FF6B35',
  white:   '#ffffff',
  g1:      '#a0a0a0',
  g2:      '#606060',
  wa:      '#25D366',
};

const card = { background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: 24 };
const label = { display: 'block', fontSize: 12, fontWeight: 600, color: S.g1, marginBottom: 8, letterSpacing: '0.02em' };
const inp = {
  width: '100%', background: S.s2, border: `1px solid ${S.border}`, borderRadius: 9,
  padding: '11px 14px', fontSize: 13, color: S.white, fontFamily: 'Inter, sans-serif',
  outline: 'none', transition: 'border-color 0.2s',
};

export default function WhatsAppBotPage() {
  const router = useRouter();
  const [shop, setShop]                     = useState(null);
  const [tab,  setTab]                      = useState('connect');
  const [broadcasts, setBroadcasts]         = useState([]);
  const [sessions,   setSessions]           = useState([]);
  const [msg,        setMsg]                = useState({ type: '', text: '' });
  const [waStatus,   setWaStatus]           = useState({ connected: false, businessNumber: '', businessName: '', botLink: null });
  const [connectForm, setConnectForm]       = useState({ phoneNumberId: '', accessToken: '' });
  const [connectLoading, setConnectLoading] = useState(false);
  const [embeddedLoading, setEmbeddedLoading] = useState(false);
  const [showManual, setShowManual]         = useState(false);
  const [btnHover, setBtnHover]             = useState(false);
  const [bcForm,     setBcForm]             = useState({ message: '', scheduledAt: '' });
  const [bcLoading,  setBcLoading]          = useState(false);
  const fbSdkLoaded = useRef(false);

  useEffect(() => {
    const shopData = localStorage.getItem('souqly_shop');
    const token    = localStorage.getItem('ownerToken');
    if (!shopData || !token) { router.push('/login'); return; }
    const parsedShop = JSON.parse(shopData);
    setShop(parsedShop);
    const h = { Authorization: `Bearer ${token}` };
    fetch(`${API_URL}/wa-connect/status`, { headers: h }).then(r => r.json()).then(d => { if (d.success) setWaStatus(d); }).catch(() => {});
    fetch(`${API_URL}/broadcast?limit=20`,  { headers: h }).then(r => r.json()).then(d => { if (d.success) setBroadcasts(d.broadcasts || []); }).catch(() => {});
    fetch(`${API_URL}/whatsapp/sessions`,   { headers: h }).then(r => r.json()).then(d => { if (d.success) setSessions(d.sessions || []); }).catch(() => {});

    // Load Meta SDK
    if (!fbSdkLoaded.current) {
      fbSdkLoaded.current = true;
      window.fbAsyncInit = function () {
        window.FB.init({
          appId: process.env.NEXT_PUBLIC_META_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v18.0',
        });
      };
      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      document.body.appendChild(script);
    }
  }, []);

  const show = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type: '', text: '' }), 5000); };
  const copy = (text) => { navigator.clipboard.writeText(text); show('success', 'Copied!'); };

  const handleEmbeddedSignup = () => {
    if (!window.FB) {
      show('error', 'Facebook SDK not loaded. Please refresh and try again.');
      return;
    }
    if (!process.env.NEXT_PUBLIC_META_APP_ID) {
      show('error', 'META_APP_ID not configured. Use manual setup below.');
      setShowManual(true);
      return;
    }
    setEmbeddedLoading(true);

    // Safety timeout — reset if FB popup is blocked or callback never fires
    const timeout = setTimeout(() => {
      setEmbeddedLoading(false);
      show('error', 'Connection timed out. Your browser may have blocked the popup — please allow popups for this site, or use manual setup below.');
      setShowManual(true);
    }, 30000);

    window.FB.login((response) => {
      clearTimeout(timeout);
      if (response.authResponse?.code) {
        (async () => {
          try {
            const token = localStorage.getItem('ownerToken');
            const res = await fetch(`${API_URL}/wa-connect/embedded-signup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ code: response.authResponse.code }),
            });
            const d = await res.json();
            if (d.success) {
              setWaStatus({ connected: true, businessNumber: d.phone, businessName: d.businessName, botLink: `https://wa.me/${(d.phone||'').replace(/\D/g,'')}?text=hi` });
              show('success', 'WhatsApp connected successfully!');
            } else {
              show('error', d.message || 'Connection failed. Try manual setup below.');
              setShowManual(true);
            }
          } catch { show('error', 'Network error. Please try manual setup below.'); setShowManual(true); }
          setEmbeddedLoading(false);
        })();
      } else {
        setEmbeddedLoading(false);
        if (response.status === 'unknown') {
          show('error', 'Popup was closed. Try again or use manual setup below.');
        } else {
          show('error', 'Permission denied. Please allow whatsapp_business_management access.');
        }
        setShowManual(true);
      }
    }, {
      scope: 'whatsapp_business_management,whatsapp_business_messaging',
      response_type: 'code',
      override_default_response_type: true,
    });
  };

  const connectWhatsApp = async (e) => {
    e.preventDefault(); setConnectLoading(true);
    try {
      const token = localStorage.getItem('ownerToken');
      const res = await fetch(`${API_URL}/wa-connect/connect`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(connectForm),
      });
      const d = await res.json();
      if (d.success) { show('success', `Connected! Your number: ${d.phoneNumber}`); setWaStatus({ connected: true, businessNumber: d.phoneNumber, businessName: '', botLink: `https://wa.me/${(d.phoneNumber||'').replace(/\D/g,'')}?text=hi` }); setConnectForm({ phoneNumberId: '', accessToken: '' }); }
      else show('error', d.message);
    } catch { show('error', 'Network error.'); } finally { setConnectLoading(false); }
  };

  const disconnectWhatsApp = async () => {
    if (!confirm('Disconnect your WhatsApp number?')) return;
    const token = localStorage.getItem('ownerToken');
    await fetch(`${API_URL}/wa-connect/disconnect`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    setWaStatus({ connected: false, businessNumber: '', businessName: '', botLink: null });
    show('success', 'Disconnected.');
  };

  const sendTestMessage = async () => {
    const token = localStorage.getItem('ownerToken');
    const testPhone = prompt('Enter your phone number to receive the test (with country code, e.g. 919876543210):');
    if (!testPhone) return;
    try {
      const res = await fetch(`${API_URL}/whatsapp/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: testPhone, message: 'Hello! This is a test message from your Souqly WhatsApp bot. Reply "hi" to start ordering.' }),
      });
      const d = await res.json();
      if (d.success) show('success', 'Test message sent!');
      else show('error', d.message || 'Failed to send test message.');
    } catch { show('error', 'Network error.'); }
  };

  const sendBroadcast = async (e) => {
    e.preventDefault(); setBcLoading(true);
    try {
      const token = localStorage.getItem('ownerToken');
      const res = await fetch(`${API_URL}/broadcast`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: bcForm.message, scheduledAt: bcForm.scheduledAt || null }),
      });
      const d = await res.json();
      if (d.success) { show('success', 'Broadcast queued!'); setBcForm({ message: '', scheduledAt: '' }); setBroadcasts(prev => [d.broadcast, ...prev]); }
      else show('error', d.message || 'Failed.');
    } catch { show('error', 'Network error.'); } finally { setBcLoading(false); }
  };

  const TABS = [
    { id: 'connect',    label: 'My Number' },
    { id: 'broadcasts', label: 'Broadcasts' },
    { id: 'abandoned',  label: 'Abandoned Carts' },
  ];

  const STEPS = [
    { icon: '👋', t: 'Customer messages YOUR number', d: 'They see your business name, not Souqly' },
    { icon: '📋', t: 'Bot shows your menu instantly', d: 'Products grouped by category with prices' },
    { icon: '🛒', t: 'Customer adds items by number', d: 'Reply "1" to add item 1, "2" for item 2, etc.' },
    { icon: '✅', t: 'Confirms name + address', d: 'Bot creates the order in your dashboard' },
    { icon: '📦', t: 'Order appears in your dashboard', d: 'Accept, pack, dispatch — customer notified from YOUR number' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar />

      <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', maxWidth: 860 }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: S.white, letterSpacing: '-0.5px' }}>WhatsApp Ordering</h1>
          <p style={{ fontSize: 13, color: S.g2, marginTop: 4 }}>Let customers order directly via WhatsApp</p>
        </div>

        {/* Toast */}
        {msg.text && (
          <div style={{
            marginBottom: 20, padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
            background: msg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            color: msg.type === 'success' ? '#4ade80' : '#f87171',
          }}>
            {msg.text}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${S.border}`, paddingBottom: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '9px 18px', borderRadius: '9px 9px 0 0', fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              cursor: 'pointer', border: 'none', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
              background: tab === t.id ? S.surface : 'transparent',
              color: tab === t.id ? S.white : S.g2,
              borderBottom: tab === t.id ? `2px solid ${S.orange}` : '2px solid transparent',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── CONNECT TAB ─────────────────────────────────────────── */}
        {tab === 'connect' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── CONNECTED STATE ── */}
            {waStatus.connected ? (
              <div style={{ ...card, textAlign: 'center', padding: 32 }}>
                {/* Check icon */}
                <div style={{ width: 64, height: 64, background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✅</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: S.wa, marginBottom: 8 }}>WhatsApp Connected</h2>

                {/* Phone number */}
                <div style={{ fontSize: 18, fontWeight: 700, color: S.white, marginBottom: 4 }}>{waStatus.businessNumber}</div>
                {waStatus.businessName && (
                  <div style={{ fontSize: 13, color: S.g1, marginBottom: 16 }}>{waStatus.businessName}</div>
                )}

                {/* Status badge */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 600, color: S.wa, marginBottom: 24 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: S.wa, display: 'inline-block' }} />
                  Active
                </div>

                {/* Copy + Test bot row */}
                {waStatus.botLink && (
                  <div style={{ background: S.s2, border: `1px solid ${S.border}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 10 }}>
                    <span style={{ fontSize: 12, color: S.g1, wordBreak: 'break-all', textAlign: 'left' }}>{waStatus.botLink}</span>
                    <button onClick={() => copy(waStatus.botLink)} style={{ flexShrink: 0, padding: '6px 14px', background: 'rgba(37,211,102,0.12)', color: S.wa, border: '1px solid rgba(37,211,102,0.2)', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      Copy
                    </button>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={sendTestMessage} style={{ flex: 1, padding: '11px 0', background: 'transparent', color: S.g1, border: `1px solid ${S.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}>
                    Send Test Message
                  </button>
                  <button onClick={disconnectWhatsApp} style={{ flex: 1, padding: '11px 0', background: 'rgba(239,68,68,0.07)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}>
                    Disconnect
                  </button>
                </div>
              </div>

            ) : (
              /* ── NOT CONNECTED STATE ── */
              <div style={{ ...card, textAlign: 'center', padding: '40px 32px' }}>
                {/* Icon */}
                <div style={{ fontSize: 48, marginBottom: 20, lineHeight: 1 }}>💬</div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: S.white, marginBottom: 10, letterSpacing: '-0.5px' }}>
                  Connect Your WhatsApp
                </h2>
                <p style={{ fontSize: 14, color: S.g1, marginBottom: 32, lineHeight: 1.6, maxWidth: 400, margin: '0 auto 32px' }}>
                  Let customers order through YOUR WhatsApp number.<br />Takes 60 seconds.
                </p>

                {/* Big green button */}
                <button
                  onClick={handleEmbeddedSignup}
                  disabled={embeddedLoading}
                  onMouseEnter={() => setBtnHover(true)}
                  onMouseLeave={() => setBtnHover(false)}
                  style={{
                    width: '100%', padding: '16px 0', background: btnHover ? '#20bd5a' : S.wa, color: '#fff',
                    borderRadius: 12, fontSize: 16, fontWeight: 700, border: 'none',
                    cursor: embeddedLoading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
                    boxShadow: btnHover ? '0 0 60px rgba(37,211,102,0.4)' : '0 0 40px rgba(37,211,102,0.25)',
                    transition: 'all 0.2s', opacity: embeddedLoading ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}
                >
                  {embeddedLoading ? (
                    <>
                      <svg style={{ animation: 'spin 0.8s linear infinite' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Connect with WhatsApp
                    </>
                  )}
                </button>

                {/* Secure note */}
                <p style={{ fontSize: 12, color: S.g2, marginTop: 12 }}>🔒 Secure connection via Meta</p>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
                  <div style={{ flex: 1, height: 1, background: S.border }} />
                  <span style={{ fontSize: 12, color: S.g2, whiteSpace: 'nowrap' }}>or connect manually</span>
                  <div style={{ flex: 1, height: 1, background: S.border }} />
                </div>

                {/* Accordion: manual setup */}
                <button
                  onClick={() => setShowManual(v => !v)}
                  style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', color: S.g1, fontSize: 13, fontWeight: 500, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {showManual ? 'Hide manual setup ↑' : 'Show manual setup ↓'}
                </button>

                {showManual && (
                  <form onSubmit={connectWhatsApp} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20, textAlign: 'left' }}>
                    <div>
                      <label style={label}>Phone Number ID <span style={{ color: S.g2, fontWeight: 400 }}>(Meta → WhatsApp → API Setup)</span></label>
                      <input value={connectForm.phoneNumberId} onChange={e => setConnectForm({ ...connectForm, phoneNumberId: e.target.value })}
                        placeholder="e.g. 137851178867XXXX" style={{ ...inp, fontFamily: 'monospace' }} required />
                    </div>
                    <div>
                      <label style={label}>Permanent Access Token <span style={{ color: S.g2, fontWeight: 400 }}>(Meta → System User → Generate Token)</span></label>
                      <input type="password" value={connectForm.accessToken} onChange={e => setConnectForm({ ...connectForm, accessToken: e.target.value })}
                        placeholder="EAAxxxxx..." style={{ ...inp, fontFamily: 'monospace' }} required />
                    </div>
                    <button type="submit" disabled={connectLoading} style={{
                      padding: '13px 0', background: S.s2, color: S.white, borderRadius: 10,
                      fontWeight: 600, fontSize: 14, border: `1px solid ${S.border}`, cursor: connectLoading ? 'not-allowed' : 'pointer',
                      opacity: connectLoading ? 0.6 : 1, fontFamily: 'Inter, sans-serif',
                    }}>
                      {connectLoading ? 'Connecting...' : 'Connect Manually'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Instructions */}
            <div style={{ ...card, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa', marginBottom: 16 }}>How to Get Your Credentials</h2>
              <ol style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 0, listStyle: 'none' }}>
                {[
                  <>Go to <strong>developers.facebook.com</strong> → Create App → Business type</>,
                  <>Add <strong>WhatsApp</strong> product → API Setup → copy your <strong>Phone Number ID</strong></>,
                  <>Go to <strong>Business Settings → System Users → Add → Admin</strong> → Generate Token → select your app → copy token</>,
                  <>Paste both above and click Connect. Souqly verifies them instantly.</>,
                  <>In your Meta App → Webhook → set URL to: <code style={{ background: '#1a1a2e', padding: '2px 6px', borderRadius: 4, fontSize: 11, color: '#93c5fd' }}>https://yes-production-4a9f.up.railway.app/api/webhook/whatsapp</code> with token <code style={{ background: '#1a1a2e', padding: '2px 6px', borderRadius: 4, fontSize: 11, color: '#93c5fd' }}>souqly_webhook_2024</code></>,
                ].map((text, i) => (
                  <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ width: 22, height: 22, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#60a5fa', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                    <span style={{ fontSize: 13, color: S.g1, lineHeight: 1.6 }}>{text}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* How it works */}
            <div style={card}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: S.white, marginBottom: 16 }}>What Customers Experience</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {STEPS.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{s.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: S.white }}>{s.t}</div>
                      <div style={{ fontSize: 12, color: S.g2, marginTop: 2 }}>{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${S.border}` }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: S.g2, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Customer commands:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['hi', '1', '2 3...', 'cart', 'done', 'repeat', 'cancel', 'menu', 'remove 2'].map(c => (
                    <code key={c} style={{ background: S.s2, border: `1px solid ${S.border}`, padding: '3px 8px', borderRadius: 5, fontSize: 11, color: S.g1, fontFamily: 'monospace' }}>{c}</code>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── BROADCASTS TAB ─────────────────────────────────────── */}
        {tab === 'broadcasts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: S.white, marginBottom: 4 }}>Send WhatsApp Broadcast</h2>
              <p style={{ fontSize: 13, color: S.g2, marginBottom: 20 }}>Send a message to all customers who've ordered from your shop.</p>
              <form onSubmit={sendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={label}>Message</label>
                  <textarea value={bcForm.message} onChange={e => setBcForm({ ...bcForm, message: e.target.value })}
                    placeholder="Hi! We have a special offer today — 20% off on all orders above ₹500. Order now..."
                    style={{ ...inp, resize: 'vertical', minHeight: 100 }} rows={4} required />
                  <p style={{ fontSize: 11, color: S.g2, marginTop: 4 }}>{bcForm.message.length} characters</p>
                </div>
                <div>
                  <label style={label}>Schedule (optional)</label>
                  <input type="datetime-local" value={bcForm.scheduledAt} onChange={e => setBcForm({ ...bcForm, scheduledAt: e.target.value })} style={inp} />
                  <p style={{ fontSize: 11, color: S.g2, marginTop: 4 }}>Leave empty to send immediately</p>
                </div>
                <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 9, padding: 12, fontSize: 12, color: '#fbbf24' }}>
                  Note: WhatsApp only allows broadcasts to customers who messaged you in the last 24 hours, or via approved Message Templates.
                </div>
                <button type="submit" disabled={bcLoading} style={{ padding: '13px 0', background: '#22c55e', color: '#fff', borderRadius: 10, fontWeight: 700, fontSize: 14, border: 'none', cursor: bcLoading ? 'not-allowed' : 'pointer', opacity: bcLoading ? 0.6 : 1, fontFamily: 'Inter, sans-serif' }}>
                  {bcLoading ? 'Sending...' : 'Send Broadcast'}
                </button>
              </form>
            </div>

            <div style={card}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: S.white, marginBottom: 16 }}>Past Broadcasts</h2>
              {broadcasts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: S.g2, fontSize: 13 }}>No broadcasts sent yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {broadcasts.map(b => (
                    <div key={b._id} style={{ padding: 14, background: S.s2, border: `1px solid ${S.border}`, borderRadius: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                        <p style={{ fontSize: 13, color: S.g1, flex: 1, lineHeight: 1.5 }}>{b.message}</p>
                        <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, fontWeight: 600, whiteSpace: 'nowrap',
                          background: b.status === 'sent' ? 'rgba(34,197,94,0.1)' : b.status === 'scheduled' ? 'rgba(59,130,246,0.1)' : 'rgba(96,96,96,0.1)',
                          color: b.status === 'sent' ? '#4ade80' : b.status === 'scheduled' ? '#60a5fa' : S.g2,
                        }}>{b.status}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 14, fontSize: 11, color: S.g2 }}>
                        <span>{b.totalRecipients || 0} recipients</span>
                        <span style={{ color: '#4ade80' }}>{b.delivered || 0} delivered</span>
                        <span style={{ color: '#f87171' }}>{b.failed || 0} failed</span>
                        <span>{new Date(b.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ABANDONED CARTS TAB ─────────────────────────────────── */}
        {tab === 'abandoned' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: S.white, marginBottom: 8 }}>Abandoned Cart Recovery</h2>
              <p style={{ fontSize: 13, color: S.g2, marginBottom: 16 }}>When a customer adds items to their WhatsApp cart but doesn't checkout, Souqly sends a reminder after 2 hours.</p>
              <div style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 9, padding: 14, fontSize: 13, color: '#4ade80', fontWeight: 500 }}>
                Auto-recovery is enabled. Reminders are sent automatically 2 hours after cart abandonment.
              </div>
            </div>

            <div style={card}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: S.white, marginBottom: 16 }}>Active Bot Sessions</h2>
              {sessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: S.g2, fontSize: 13 }}>No active bot sessions right now.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sessions.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: S.s2, border: `1px solid ${S.border}`, borderRadius: 10 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: S.white }}>+{s.phone}{s.customerName ? ` · ${s.customerName}` : ''}</div>
                        <div style={{ fontSize: 11, color: S.g2, marginTop: 2 }}>Step: {s.step} · {s.cart?.length || 0} items · ₹{s.cart?.reduce((a, b) => a + b.price * b.qty, 0) || 0}</div>
                      </div>
                      <span style={{
                        fontSize: 11, padding: '3px 9px', borderRadius: 6, fontWeight: 600,
                        background: s.step === 'browsing' && s.cart?.length > 0 ? 'rgba(255,107,53,0.1)' : 'rgba(96,96,96,0.1)',
                        color: s.step === 'browsing' && s.cart?.length > 0 ? S.orange : S.g2,
                      }}>
                        {s.step === 'browsing' && s.cart?.length > 0 ? 'Abandoned' : s.step}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
