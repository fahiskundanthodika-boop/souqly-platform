'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../components/Sidebar';
import { API_URL } from '../../../lib/config';
import { THEMES, getThemeColors } from '../../../lib/themes';

const S = {
  bg: '#080808', surface: '#0f0f0f', s2: '#161616',
  border: '#1f1f1f', orange: '#FF6B35', white: '#ffffff',
  g1: '#a0a0a0', g2: '#606060',
};

// Mini store preview using a theme
function ThemePreview({ themeKey, active }) {
  const t = THEMES[themeKey];
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: `2px solid ${active ? S.orange : 'transparent'}`, transition: 'border-color 0.2s', flexShrink: 0 }}>
      {/* Header */}
      <div style={{ background: t.header, padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 20, background: 'rgba(255,255,255,0.3)', borderRadius: 5 }} />
          <div style={{ width: 40, height: 6, background: t.headerText === '#ffffff' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.5)', borderRadius: 3 }} />
        </div>
        <div style={{ width: 16, height: 16, background: 'rgba(255,255,255,0.25)', borderRadius: 4 }} />
      </div>
      {/* Body */}
      <div style={{ background: t.background, padding: '8px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 6, padding: 5 }}>
            <div style={{ height: 28, background: t.badge, borderRadius: 4, marginBottom: 4 }} />
            <div style={{ height: 4, background: t.text === '#ffffff' ? 'rgba(255,255,255,0.3)' : '#ddd', borderRadius: 2, marginBottom: 3, width: '80%' }} />
            <div style={{ height: 4, background: t.primary, borderRadius: 2, width: '40%' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ThemesPage() {
  const router = useRouter();
  const [selected, setSelected]   = useState('classic-white');
  const [saved,    setSaved]      = useState('classic-white');
  const [saving,   setSaving]     = useState(false);
  const [loading,  setLoading]    = useState(true);
  const [toast,    setToast]      = useState({ show: false, msg: '', ok: true });
  const [customColors, setCustomColors] = useState({});
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('ownerToken');
    if (!token) { router.push('/login'); return; }
    fetch(`${API_URL}/theme`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.theme) {
          const th = d.theme.theme || 'classic-white';
          setSelected(th);
          setSaved(th);
          if (d.theme.themeColors) setCustomColors(d.theme.themeColors);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg, ok = true) => {
    setToast({ show: true, msg, ok });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3500);
  };

  const applyTheme = async () => {
    setSaving(true);
    const token = localStorage.getItem('ownerToken');
    const base  = THEMES[selected];
    const merged = { ...base, ...customColors };
    try {
      const res = await fetch(`${API_URL}/theme/select`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          theme: selected,
          colorScheme: 'default',
          themeColors: {
            primary:    merged.primary,
            background: merged.background,
            card:       merged.card,
            text:       merged.text,
            accent:     merged.primary,
          },
        }),
      });
      const d = await res.json();
      if (d.success) {
        setSaved(selected);
        // Update localStorage so sidebar reflects new theme
        const shopRaw = localStorage.getItem('souqly_shop');
        if (shopRaw) {
          const shop = JSON.parse(shopRaw);
          shop.theme       = selected;
          shop.primaryColor = merged.primary;
          localStorage.setItem('souqly_shop', JSON.stringify(shop));
        }
        showToast('Theme applied! Your store now uses this theme.');
      } else {
        showToast('Failed to save theme', false);
      }
    } catch { showToast('Network error', false); }
    finally { setSaving(false); }
  };

  const preview = getThemeColors(selected, customColors);

  const COLOR_FIELDS = [
    { key: 'primary',    label: 'Primary / Buttons' },
    { key: 'background', label: 'Page Background' },
    { key: 'card',       label: 'Card Background' },
    { key: 'text',       label: 'Text Color' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', fontFamily: 'Inter,sans-serif' }}>
      <Sidebar />

      <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: S.white, letterSpacing: '-0.5px' }}>Store Themes</h1>
            <p style={{ fontSize: 13, color: S.g2, marginTop: 4 }}>Pick a theme for your customer store — changes apply instantly</p>
          </div>
          <button
            onClick={applyTheme}
            disabled={saving || selected === saved}
            style={{ padding: '11px 24px', background: selected !== saved ? S.orange : S.s2, color: selected !== saved ? '#fff' : S.g2, border: `1px solid ${selected !== saved ? 'transparent' : S.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: selected !== saved ? 'pointer' : 'not-allowed', fontFamily: 'Inter,sans-serif', transition: 'all 0.2s' }}
          >
            {saving ? 'Applying...' : selected === saved ? 'Applied ✓' : 'Apply Theme →'}
          </button>
        </div>

        {/* Toast */}
        {toast.show && (
          <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, background: toast.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${toast.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, color: toast.ok ? '#4ade80' : '#f87171' }}>
            {toast.msg}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: S.g2 }}>Loading...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {Object.entries(THEMES).map(([key, theme]) => {
              const isSelected = selected === key;
              const isSaved    = saved === key;
              return (
                <div
                  key={key}
                  onClick={() => setSelected(key)}
                  style={{
                    background: S.surface, border: `2px solid ${isSelected ? S.orange : S.border}`,
                    borderRadius: 14, padding: 16, cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: isSelected ? `0 0 20px rgba(255,107,53,0.15)` : 'none',
                  }}
                >
                  {/* Mini preview */}
                  <ThemePreview themeKey={key} active={isSelected} />

                  {/* Name + badges */}
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: S.white }}>{theme.name}</div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        {['primary','background','header','badge'].map(f => (
                          <div key={f} title={f} style={{ width: 14, height: 14, borderRadius: 3, background: theme[f] || '#ccc', border: `1px solid ${S.border}` }} />
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {isSaved && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>ACTIVE</span>
                      )}
                      {isSelected && !isSaved && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `rgba(255,107,53,0.12)`, color: S.orange, border: `1px solid rgba(255,107,53,0.2)` }}>SELECTED</span>
                      )}
                      {theme.rtl && (
                        <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>RTL</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Custom color overrides */}
        <div style={{ marginTop: 32, background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: 20 }}>
          <button
            onClick={() => setShowCustom(v => !v)}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Inter,sans-serif' }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: S.white, textAlign: 'left' }}>Custom Color Overrides</div>
              <div style={{ fontSize: 12, color: S.g2, marginTop: 2, textAlign: 'left' }}>Fine-tune any color from the selected theme</div>
            </div>
            <span style={{ color: S.g2, fontSize: 18 }}>{showCustom ? '↑' : '↓'}</span>
          </button>

          {showCustom && (
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
              {COLOR_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: S.g1, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={customColors[key] || preview[key] || '#ffffff'}
                      onChange={e => setCustomColors(c => ({ ...c, [key]: e.target.value }))}
                      style={{ width: 38, height: 38, borderRadius: 7, border: `1px solid ${S.border}`, background: 'none', cursor: 'pointer', padding: 2 }}
                    />
                    <span style={{ fontSize: 12, color: S.g1, fontFamily: 'monospace' }}>{customColors[key] || preview[key]}</span>
                  </div>
                </div>
              ))}
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={() => setCustomColors({})} style={{ padding: '7px 14px', background: 'transparent', color: S.g2, border: `1px solid ${S.border}`, borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                  Reset to theme defaults
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live preview panel */}
        <div style={{ marginTop: 20, background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: S.white, marginBottom: 16 }}>Live Preview — {THEMES[selected]?.name}</div>
          <div style={{ background: preview.background, borderRadius: 12, overflow: 'hidden', maxWidth: 320 }}>
            <div style={{ background: preview.header, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: preview.headerText }}>My Store</div>
              <div style={{ fontSize: 18 }}>🛒</div>
            </div>
            <div style={{ padding: '12px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['Tomatoes', 'Milk', 'Bread', 'Eggs'].map(n => (
                <div key={n} style={{ background: preview.card, border: `1px solid ${preview.border}`, borderRadius: 10, padding: 10 }}>
                  <div style={{ height: 48, background: preview.badge, borderRadius: 7, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛍️</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: preview.text, marginBottom: 4 }}>{n}</div>
                  <div style={{ fontSize: 11, color: preview.primary, fontWeight: 700, marginBottom: 6 }}>₹49</div>
                  <div style={{ background: preview.primary, color: '#fff', borderRadius: 6, padding: '5px 0', textAlign: 'center', fontSize: 11, fontWeight: 600 }}>Add +</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
