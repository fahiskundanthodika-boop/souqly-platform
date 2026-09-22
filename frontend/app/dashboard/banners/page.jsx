'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../components/Sidebar';
import { API_URL } from '../../../lib/config';

const S = {
  bg: '#080808', surface: '#0f0f0f', s2: '#161616',
  border: '#1f1f1f', orange: '#FF6B35', white: '#ffffff',
  g1: '#a0a0a0', g2: '#606060',
};

const TABS = [
  { id: 'hero',  label: 'Hero Slider',   desc: 'Full-width banners at the top of your store' },
  { id: 'mini',  label: 'Mini Banners',  desc: 'Small horizontal cards below the hero' },
  { id: 'side',  label: 'Side Banners',  desc: 'Tall vertical banners in the sidebar' },
  { id: 'flash', label: 'Flash Sale',    desc: 'Countdown timer strip for limited-time deals' },
];

const PRESETS = [
  { label: 'Ocean Blue',   value: 'linear-gradient(135deg,#0a1628,#1a3a6e)' },
  { label: 'Sunset',       value: 'linear-gradient(135deg,#1a0533,#6b21a8)' },
  { label: 'Forest',       value: 'linear-gradient(135deg,#052e16,#166534)' },
  { label: 'Fire',         value: 'linear-gradient(135deg,#431407,#c2410c)' },
  { label: 'Rose Gold',    value: 'linear-gradient(135deg,#4c0519,#be185d)' },
  { label: 'Midnight',     value: 'linear-gradient(135deg,#020617,#1e3a5f)' },
];

const empty = (type) => ({
  type, title: '', subtitle: '', tag: '', emoji: '🎉',
  background: PRESETS[0].value, tagColor: '#FF6B35',
  linkTo: 'all', buttonText: 'Shop Now', isActive: true,
  flashEndDate: '', flashEndTime: '',
});

const card = { background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: 20 };
const inp = { width: '100%', background: S.s2, border: `1px solid ${S.border}`, borderRadius: 9, padding: '10px 13px', fontSize: 13, color: S.white, fontFamily: 'Inter,sans-serif', outline: 'none' };
const lbl = { display: 'block', fontSize: 11, fontWeight: 600, color: S.g1, marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' };

// Live banner preview
function BannerPreview({ form }) {
  return (
    <div style={{
      background: form.background, borderRadius: 12, padding: '20px 24px',
      minHeight: 110, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 48, opacity: 0.25 }}>{form.emoji}</div>
      {form.tag && (
        <span style={{ display: 'inline-block', background: form.tagColor, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, marginBottom: 8, width: 'fit-content' }}>{form.tag}</span>
      )}
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{form.title || 'Banner Title'}</div>
        {form.subtitle && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{form.subtitle}</div>}
      </div>
      <button style={{ marginTop: 12, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, width: 'fit-content', cursor: 'default' }}>
        {form.buttonText || 'Shop Now'}
      </button>
    </div>
  );
}

export default function BannersPage() {
  const router = useRouter();
  const [tab, setTab]           = useState('hero');
  const [banners, setBanners]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(empty('hero'));
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState({ show: false, msg: '', ok: true });
  const [dragOver, setDragOver] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('ownerToken');
    if (!token) { router.push('/login'); return; }
    loadBanners(token);
  }, []);

  const loadBanners = (token) => {
    token = token || localStorage.getItem('ownerToken');
    setLoading(true);
    fetch(`${API_URL}/banners`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success) setBanners(d.banners); }).finally(() => setLoading(false));
  };

  const showToast = (msg, ok = true) => { setToast({ show: true, msg, ok }); setTimeout(() => setToast(t => ({ ...t, show: false })), 3500); };

  const openAdd = () => { setEditing(null); setForm(empty(tab)); setModal(true); };
  const openEdit = (b) => { setEditing(b); setForm({ ...b, flashEndDate: b.flashEndDate ? b.flashEndDate.slice(0, 10) : '', flashEndTime: b.flashEndTime || '' }); setModal(true); };

  const save = async () => {
    if (!form.title.trim()) { showToast('Title is required', false); return; }
    setSaving(true);
    const token = localStorage.getItem('ownerToken');
    const url    = editing ? `${API_URL}/banners/${editing._id}` : `${API_URL}/banners`;
    const method = editing ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...form, type: editing ? editing.type : tab }) });
      const d = await res.json();
      if (d.success) { showToast(editing ? 'Banner updated!' : 'Banner created!'); setModal(false); loadBanners(); }
      else showToast(d.error || 'Failed', false);
    } catch { showToast('Network error', false); } finally { setSaving(false); }
  };

  const toggle = async (b) => {
    const token = localStorage.getItem('ownerToken');
    const res = await fetch(`${API_URL}/banners/${b._id}/toggle`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    const d = await res.json();
    if (d.success) { setBanners(prev => prev.map(x => x._id === b._id ? d.banner : x)); showToast(d.banner.isActive ? 'Banner activated' : 'Banner hidden'); }
  };

  const remove = async (b) => {
    if (!confirm(`Delete "${b.title}"?`)) return;
    const token = localStorage.getItem('ownerToken');
    await fetch(`${API_URL}/banners/${b._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setBanners(prev => prev.filter(x => x._id !== b._id));
    showToast('Banner deleted');
  };

  const tabBanners = banners.filter(b => b.type === tab);
  const currentTab = TABS.find(t => t.id === tab);

  return (
    <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', fontFamily: 'Inter,sans-serif' }}>
      <Sidebar />

      <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: S.white, letterSpacing: '-0.5px' }}>Banner Management</h1>
            <p style={{ fontSize: 13, color: S.g2, marginTop: 4 }}>Design promotional banners for your customer store</p>
          </div>
          <button onClick={openAdd} style={{ padding: '10px 20px', background: S.orange, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter,sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
            + Add Banner
          </button>
        </div>

        {/* Toast */}
        {toast.show && (
          <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, background: toast.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${toast.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, color: toast.ok ? '#4ade80' : '#f87171' }}>
            {toast.msg}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${S.border}` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '9px 18px', borderRadius: '9px 9px 0 0', fontSize: 13, fontWeight: tab === t.id ? 600 : 400, cursor: 'pointer', border: 'none', fontFamily: 'Inter,sans-serif', background: tab === t.id ? S.surface : 'transparent', color: tab === t.id ? S.white : S.g2, borderBottom: tab === t.id ? `2px solid ${S.orange}` : '2px solid transparent' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab description */}
        <p style={{ fontSize: 13, color: S.g2, marginBottom: 20 }}>{currentTab?.desc}</p>

        {/* Banners list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: S.g2 }}>Loading...</div>
        ) : tabBanners.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
            <p style={{ color: S.g1, fontWeight: 600, marginBottom: 4 }}>No {currentTab?.label} yet</p>
            <p style={{ color: S.g2, fontSize: 13, marginBottom: 20 }}>Create your first banner to display on your store</p>
            <button onClick={openAdd} style={{ padding: '10px 24px', background: S.orange, color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>+ Add {currentTab?.label}</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tabBanners.map((b) => (
              <div key={b._id} style={{ ...card, display: 'flex', gap: 16, alignItems: 'center' }}>
                {/* Preview */}
                <div style={{ width: 180, flexShrink: 0, background: b.background, borderRadius: 9, padding: '12px 14px', minHeight: 72, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 28, opacity: 0.2 }}>{b.emoji}</div>
                  {b.tag && <span style={{ display: 'inline-block', background: b.tagColor, color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, marginBottom: 4 }}>{b.tag}</span>}
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{b.title}</div>
                  {b.subtitle && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{b.subtitle}</div>}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: S.white, marginBottom: 4 }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: S.g2 }}>Links to: {b.linkTo} · Button: "{b.buttonText}"</div>
                </div>

                {/* Status + actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, background: b.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(96,96,96,0.1)', color: b.isActive ? '#4ade80' : S.g2, border: `1px solid ${b.isActive ? 'rgba(34,197,94,0.2)' : S.border}` }}>
                    {b.isActive ? 'Active' : 'Hidden'}
                  </span>
                  <button onClick={() => toggle(b)} style={{ padding: '6px 12px', background: S.s2, color: S.g1, border: `1px solid ${S.border}`, borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                    {b.isActive ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => openEdit(b)} style={{ padding: '6px 12px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                    Edit
                  </button>
                  <button onClick={() => remove(b)} style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── MODAL ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div style={{ background: '#0f0f0f', border: `1px solid ${S.border}`, borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: S.white }}>{editing ? 'Edit Banner' : `New ${TABS.find(t => t.id === tab)?.label}`}</h2>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: S.g2, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Left — form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={lbl}>Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Weekend Mega Sale" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Subtitle</label>
                  <input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="Up to 50% off on everything" style={inp} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={lbl}>Tag Label</label>
                    <input value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))} placeholder="LIMITED OFFER" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Emoji</label>
                    <input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} placeholder="🎉" style={inp} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Button Text</label>
                  <input value={form.buttonText} onChange={e => setForm(f => ({ ...f, buttonText: e.target.value }))} placeholder="Shop Now" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Background Preset</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {PRESETS.map(p => (
                      <button key={p.value} onClick={() => setForm(f => ({ ...f, background: p.value }))} title={p.label} style={{ width: 32, height: 32, borderRadius: 7, background: p.value, border: form.background === p.value ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={lbl}>Tag Color</label>
                    <input type="color" value={form.tagColor} onChange={e => setForm(f => ({ ...f, tagColor: e.target.value }))} style={{ ...inp, padding: 4, height: 38, cursor: 'pointer' }} />
                  </div>
                  <div>
                    <label style={lbl}>Link To</label>
                    <input value={form.linkTo} onChange={e => setForm(f => ({ ...f, linkTo: e.target.value }))} placeholder="all / category name" style={inp} />
                  </div>
                </div>
                {(editing?.type === 'flash' || tab === 'flash') && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={lbl}>End Date</label>
                      <input type="date" value={form.flashEndDate} onChange={e => setForm(f => ({ ...f, flashEndDate: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>End Time</label>
                      <input type="time" value={form.flashEndTime} onChange={e => setForm(f => ({ ...f, flashEndTime: e.target.value }))} style={inp} />
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ ...lbl, margin: 0 }}>Active</label>
                  <button onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: form.isActive ? '#22c55e' : S.s2, position: 'relative', transition: 'background 0.2s' }}>
                    <span style={{ position: 'absolute', top: 3, left: form.isActive ? 22 : 4, width: 18, height: 18, background: '#fff', borderRadius: '50%', transition: 'left 0.2s', display: 'block' }} />
                  </button>
                  <span style={{ fontSize: 12, color: S.g2 }}>{form.isActive ? 'Visible on store' : 'Hidden'}</span>
                </div>
              </div>

              {/* Right — live preview */}
              <div>
                <label style={lbl}>Live Preview</label>
                <BannerPreview form={form} />
                <p style={{ fontSize: 11, color: S.g2, marginTop: 8 }}>Preview updates as you type</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ padding: '11px 20px', background: 'transparent', color: S.g1, border: `1px solid ${S.border}`, borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ padding: '11px 24px', background: S.orange, color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'Inter,sans-serif' }}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Banner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
