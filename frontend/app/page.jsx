import Link from 'next/link';

/* ─── Design tokens ────────────────────────────────────────────────── */
const T = {
  bg:       '#080808',
  surface:  '#0f0f0f',
  surface2: '#161616',
  border:   '#1f1f1f',
  orange:   '#FF6B35',
  white:    '#ffffff',
  grey1:    '#a0a0a0',
  grey2:    '#606060',
};

/* ─── Feature cards data ────────────────────────────────────────────── */
const FEATURES = [
  { icon: '🌐', title: 'Branded Online Store',    desc: 'Your own storefront with a unique link. Custom logo, colors, and menu.' },
  { icon: '💬', title: 'WhatsApp Ordering',       desc: 'Customers browse and order via WhatsApp — zero app download needed.' },
  { icon: '🔔', title: 'Live Order Dashboard',    desc: 'Real-time order alerts. Accept, pack, and dispatch from one screen.' },
  { icon: '🛵', title: 'Rider Delivery App',      desc: 'Assign riders instantly. Track live location from pickup to door.' },
  { icon: '🧾', title: 'Auto GST Invoices',       desc: 'India-compliant tax invoices generated and emailed automatically.' },
  { icon: '📣', title: 'Broadcast Messages',      desc: 'Send WhatsApp promos to all customers with one click.' },
  { icon: '🏪', title: 'POS Counter System',      desc: 'Walk-in orders, barcode scan, and cash receipt on any device.' },
  { icon: '🏢', title: 'Multi-Branch',            desc: 'Run multiple locations with their own inventory and staff.' },
  { icon: '📊', title: 'Sales Analytics',         desc: 'Revenue charts, top products, and customer insights at a glance.' },
];

const PLANS = [
  {
    name: 'Free', price: '0', sub: '/month',
    cap: '50 orders / month', popular: false,
    features: ['1 Store', '50 Products', '100 Orders/mo', 'WhatsApp Alerts', 'Basic Analytics'],
  },
  {
    name: 'Starter', price: '999', sub: '/month',
    cap: '500 orders / month', popular: true,
    features: ['500 Products', 'Unlimited Orders', 'WhatsApp Bot', 'GST Invoices', 'Rider App'],
  },
  {
    name: 'Growth', price: '2,499', sub: '/month',
    cap: 'Unlimited orders', popular: false,
    features: ['3 Branches', 'WhatsApp Marketing', 'POS System', 'Advanced Reports', 'Priority Support'],
  },
  {
    name: 'Business', price: '4,999', sub: '/month',
    cap: 'Everything included', popular: false,
    features: ['10 Branches', 'API Access', 'Custom Domain', 'Dedicated Manager', 'SLA Guarantee'],
  },
];

const MARKETS = [
  { flag: '🇮🇳', name: 'India',        pay: 'UPI · COD · Razorpay',  lang: 'Hindi + 6 languages' },
  { flag: '🇸🇦', name: 'Saudi Arabia', pay: 'mada · COD · Tabby',     lang: 'Arabic · English' },
  { flag: '🇦🇪', name: 'UAE',          pay: 'Card · Apple Pay · COD', lang: 'Arabic · English' },
  { flag: '🇶🇦', name: 'Qatar',        pay: 'Card · COD',              lang: 'Arabic · English' },
  { flag: '🇰🇼', name: 'Kuwait',       pay: 'Card · COD',              lang: 'Arabic · English' },
];

const STEPS = [
  { num: '01', title: 'Sign up free',       desc: 'Create your account in 60 seconds. No credit card, no contract.' },
  { num: '02', title: 'Add your products',  desc: 'Upload products manually, via Excel, or let our WhatsApp bot do it.' },
  { num: '03', title: 'Share and sell',     desc: 'Share your store link. Orders flow in on WhatsApp and dashboard.' },
];

/* ─── Page ─────────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <div style={{ background: T.bg, color: T.white, fontFamily: "'Inter', sans-serif", minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── Google Font ──────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        a { text-decoration: none; color: inherit; }

        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,107,53,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(255,107,53,0); }
        }

        .nav-link {
          color: ${T.grey1};
          font-size: 14px;
          font-weight: 500;
          transition: color 0.2s;
        }
        .nav-link:hover { color: ${T.white}; }

        .btn-orange {
          display: inline-flex; align-items: center; gap: 8px;
          background: ${T.orange}; color: ${T.white};
          padding: 10px 20px; border-radius: 10px;
          font-size: 14px; font-weight: 600;
          border: none; cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }
        .btn-orange:hover {
          background: #ff7a45;
          box-shadow: 0 8px 32px rgba(255,107,53,0.45);
          transform: translateY(-1px);
        }

        .btn-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: ${T.grey1};
          padding: 10px 20px; border-radius: 10px;
          font-size: 14px; font-weight: 500;
          border: 1px solid ${T.border}; cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }
        .btn-ghost:hover {
          border-color: #3a3a3a;
          color: ${T.white};
          background: rgba(255,255,255,0.04);
        }

        .btn-orange-lg {
          display: inline-flex; align-items: center; gap: 8px;
          background: ${T.orange}; color: ${T.white};
          padding: 14px 28px; border-radius: 12px;
          font-size: 16px; font-weight: 700;
          border: none; cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }
        .btn-orange-lg:hover {
          background: #ff7a45;
          box-shadow: 0 12px 40px rgba(255,107,53,0.5);
          transform: translateY(-2px);
        }

        .btn-ghost-lg {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: ${T.grey1};
          padding: 14px 28px; border-radius: 12px;
          font-size: 16px; font-weight: 600;
          border: 1px solid ${T.border}; cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }
        .btn-ghost-lg:hover {
          border-color: #3a3a3a;
          color: ${T.white};
        }

        .feature-card {
          background: ${T.surface};
          padding: 28px;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }
        .feature-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, ${T.orange}, transparent);
          opacity: 0; transition: opacity 0.2s;
        }
        .feature-card:hover::before { opacity: 1; }
        .feature-card:hover { background: #111; }

        .plan-card {
          background: ${T.surface};
          border: 1px solid ${T.border};
          border-radius: 16px;
          padding: 28px;
          transition: all 0.2s;
        }
        .plan-card:hover { border-color: #2a2a2a; }
        .plan-card.popular {
          border-color: ${T.orange};
          background: linear-gradient(135deg, #0f0f0f 0%, #1a0f09 100%);
        }

        .market-card {
          background: ${T.surface};
          border: 1px solid ${T.border};
          border-radius: 14px;
          padding: 22px 24px;
          transition: all 0.2s;
        }
        .market-card:hover {
          border-color: #2a2a2a;
          background: #111;
        }

        .step-card {
          background: ${T.surface};
          border: 1px solid ${T.border};
          border-radius: 16px;
          padding: 32px;
          position: relative;
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .step-card:hover { border-color: #2a2a2a; }

        .footer-link {
          font-size: 13px; color: ${T.grey2}; transition: color 0.2s;
        }
        .footer-link:hover { color: ${T.white}; }

        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .hero-h1 { font-size: clamp(36px, 9vw, 60px) !important; letter-spacing: -1.5px !important; }
          .stats-row { flex-wrap: wrap !important; gap: 12px !important; }
          .stat-divider { display: none !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .markets-grid { grid-template-columns: 1fr 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .dash-sidebar { display: none !important; }
          .hero-btns { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      {/* ── NAVBAR ──────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(8,8,8,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: T.orange, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(255,107,53,0.4)' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>S</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.3px' }}>Souqly</span>
          </div>

          {/* Nav links */}
          <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <a href="#features" className="nav-link">Features</a>
            <a href="#pricing"  className="nav-link">Pricing</a>
            <a href="#markets"  className="nav-link">Markets</a>
            <Link href="/store/demo" className="nav-link">Demo</Link>
          </div>

          {/* CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/login" className="btn-ghost">Sign In</Link>
            <Link href="/signup" className="btn-orange">Start Free</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative',
        minHeight: '92vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 24px 100px',
        overflow: 'hidden',
        backgroundImage: `
          linear-gradient(rgba(255,107,53,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,107,53,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }}>
        {/* Orange glow blob */}
        <div style={{
          position: 'absolute', top: '20%', left: '50%',
          transform: 'translateX(-50%)',
          width: 600, height: 400,
          background: 'radial-gradient(ellipse at center, rgba(255,107,53,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 820, margin: '0 auto' }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 50, padding: '8px 16px', marginBottom: 32 }}>
            <div style={{ position: 'relative', width: 8, height: 8 }}>
              <div style={{ position: 'absolute', inset: 0, background: T.orange, borderRadius: '50%', animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
              <div style={{ position: 'relative', width: 8, height: 8, background: T.orange, borderRadius: '50%' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: T.grey1 }}>Now live in India, Saudi &amp; UAE</span>
          </div>

          {/* H1 */}
          <h1 className="hero-h1" style={{ fontSize: 'clamp(42px,7vw,82px)', fontWeight: 900, letterSpacing: '-3px', lineHeight: 1.05, marginBottom: 24 }}>
            Your store online<br />
            in <span style={{ color: T.orange }}>5 minutes</span>
          </h1>

          {/* Subtext */}
          <p style={{ fontSize: 18, color: T.grey1, lineHeight: 1.65, maxWidth: 560, margin: '0 auto 40px', fontWeight: 400 }}>
            WhatsApp ordering, live delivery tracking, GST invoices — everything your business needs to grow online.
          </p>

          {/* CTAs */}
          <div className="hero-btns" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 56, flexWrap: 'wrap' }}>
            <Link href="/signup" className="btn-orange-lg">Create your free store</Link>
            <Link href="/store/demo" className="btn-ghost-lg">See a live demo →</Link>
          </div>

          {/* Stats row */}
          <div className="stats-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'wrap' }}>
            {[
              ['500+', 'Stores'],
              ['₹0', 'Commission'],
              ['30 min', 'Setup Time'],
              ['3+', 'Countries'],
            ].map(([val, label], i, arr) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ padding: '0 28px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.white }}>{val}</div>
                  <div style={{ fontSize: 12, color: T.grey2, marginTop: 2, fontWeight: 500 }}>{label}</div>
                </div>
                {i < arr.length - 1 && (
                  <div className="stat-divider" style={{ width: 1, height: 36, background: T.border }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ───────────────────────────────────────────────── */}
      <section style={{ borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, padding: '16px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.grey2, letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>
            Trusted by businesses across
          </span>
          {[
            { flag: '🇮🇳', name: 'India' },
            { flag: '🇸🇦', name: 'Saudi' },
            { flag: '🇦🇪', name: 'UAE' },
            { flag: '🇶🇦', name: 'Qatar' },
            { flag: '🇰🇼', name: 'Kuwait' },
          ].map(({ flag, name }) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 18 }}>{flag}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: T.grey1 }}>{name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES GRID ───────────────────────────────────────────── */}
      <section id="features" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.orange, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
              Platform Features
            </div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.1 }}>
              Everything your business needs
            </h2>
            <p style={{ color: T.grey1, marginTop: 16, fontSize: 16, maxWidth: 520, margin: '16px auto 0' }}>
              One platform. Every tool to sell online, manage deliveries, and grow.
            </p>
          </div>

          {/* Grid with 1px border lines */}
          <div
            className="features-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              background: T.border,
              gap: 1,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} className="feature-card">
                <div style={{ width: 42, height: 42, background: 'rgba(255,107,53,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 16 }}>
                  {icon}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: T.white }}>{title}</h3>
                <p style={{ fontSize: 13, color: T.grey1, lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ───────────────────────────────────────── */}
      <section style={{ padding: '0 24px 100px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.orange, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
              Dashboard
            </div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800, letterSpacing: '-1.5px' }}>
              Your command center
            </h2>
            <p style={{ color: T.grey1, marginTop: 12, fontSize: 15 }}>
              Manage orders, riders, and revenue from one clean dashboard.
            </p>
          </div>

          {/* Mock dashboard */}
          <div style={{
            background: '#0a0a0a',
            borderRadius: 16,
            border: `1px solid ${T.border}`,
            overflow: 'hidden',
            boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
          }}>
            {/* Traffic light bar */}
            <div style={{ background: '#111', borderBottom: `1px solid ${T.border}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, background: '#ff5f56', borderRadius: '50%' }} />
              <div style={{ width: 12, height: 12, background: '#ffbd2e', borderRadius: '50%' }} />
              <div style={{ width: 12, height: 12, background: '#27c93f', borderRadius: '50%' }} />
              <span style={{ marginLeft: 12, fontSize: 12, color: T.grey2, fontWeight: 500 }}>Souqly Dashboard — Al Noor Grocery</span>
            </div>

            <div style={{ display: 'flex', minHeight: 420 }}>
              {/* Sidebar */}
              <div className="dash-sidebar" style={{ width: 180, borderRight: `1px solid ${T.border}`, padding: '20px 12px', flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.grey2, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 8px', marginBottom: 12 }}>Menu</div>
                {[
                  ['📊', 'Dashboard', true],
                  ['📦', 'Orders', false],
                  ['🛍️', 'Products', false],
                  ['🛵', 'Riders', false],
                  ['📣', 'Marketing', false],
                  ['⚙️', 'Settings', false],
                ].map(([icon, label, active]) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 8, marginBottom: 2,
                    background: active ? 'rgba(255,107,53,0.12)' : 'transparent',
                    color: active ? T.orange : T.grey2,
                    fontSize: 13, fontWeight: active ? 600 : 400,
                  }}>
                    <span style={{ fontSize: 14 }}>{icon}</span>{label}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div style={{ flex: 1, padding: '20px 24px' }}>
                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                  {[
                    ['Today Orders', '24', '+8 from yesterday'],
                    ['Revenue', '₹18,420', 'today'],
                    ['Pending', '3', 'awaiting action'],
                    ['Riders Online', '2', 'of 3 active'],
                  ].map(([label, val, sub]) => (
                    <div key={label} style={{ background: T.surface2, borderRadius: 10, padding: '14px 16px', border: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 11, color: T.grey2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: T.white }}>{val}</div>
                      <div style={{ fontSize: 11, color: T.grey2, marginTop: 3 }}>{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Order feed */}
                <div style={{ fontSize: 13, fontWeight: 600, color: T.grey1, marginBottom: 12 }}>Live Orders</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { id: '#1047', customer: 'Rahul Sharma', items: '3 items · ₹640', status: 'NEW', statusColor: T.orange, pulse: true },
                    { id: '#1046', customer: 'Fatima Al-Sayed', items: '2 items · ₹380', status: 'Packing', statusColor: '#f59e0b', pulse: false },
                    { id: '#1045', customer: 'Mohammed Al-Rashid', items: '5 items · ₹1,240', status: 'Delivered', statusColor: '#22c55e', pulse: false },
                  ].map(({ id, customer, items, status, statusColor, pulse }) => (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.surface2, borderRadius: 10, padding: '12px 16px', border: `1px solid ${T.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: T.white }}>{id}</span>
                        <span style={{ fontSize: 13, color: T.grey1 }}>{customer}</span>
                        <span style={{ fontSize: 12, color: T.grey2 }}>{items}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {pulse && (
                          <div style={{ position: 'relative', width: 8, height: 8 }}>
                            <div style={{ position: 'absolute', inset: 0, background: statusColor, borderRadius: '50%', animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
                            <div style={{ position: 'relative', width: 8, height: 8, background: statusColor, borderRadius: '50%' }} />
                          </div>
                        )}
                        <span style={{ background: `${statusColor}20`, color: statusColor, borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${statusColor}40` }}>
                          {status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 100px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.orange, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
              Get Started
            </div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800, letterSpacing: '-1.5px' }}>
              Live in 30 minutes
            </h2>
          </div>

          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="step-card">
                <div style={{ fontSize: 64, fontWeight: 900, color: T.surface2, lineHeight: 1, marginBottom: 20, userSelect: 'none' }}>{num}</div>
                <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 10, color: T.white }}>{title}</h3>
                <p style={{ fontSize: 14, color: T.grey1, lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '0 24px 100px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.orange, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
              Pricing
            </div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800, letterSpacing: '-1.5px' }}>
              Start free. Upgrade when you grow.
            </h2>
          </div>

          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            {PLANS.map((plan) => (
              <div key={plan.name} className={`plan-card${plan.popular ? ' popular' : ''}`} style={{ position: 'relative' }}>
                {plan.popular && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: T.orange, color: '#fff', borderRadius: 50, padding: '4px 14px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{ fontWeight: 700, fontSize: 16, color: T.white, marginBottom: 4 }}>{plan.name}</div>
                <div style={{ fontSize: 11, color: T.grey2, marginBottom: 20 }}>{plan.cap}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 24 }}>
                  <span style={{ fontSize: 13, color: T.grey1, marginBottom: 4 }}>₹</span>
                  <span style={{ fontSize: 36, fontWeight: 900, color: T.white, letterSpacing: '-1px', lineHeight: 1 }}>{plan.price}</span>
                  <span style={{ fontSize: 13, color: T.grey2, marginBottom: 6 }}>{plan.sub}</span>
                </div>
                <ul style={{ listStyle: 'none', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.grey1 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="7" fill={`${T.orange}22`} />
                        <path d="M4 7l2 2 4-4" stroke={T.orange} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  style={{
                    display: 'block', textAlign: 'center',
                    padding: '11px 0', borderRadius: 10,
                    fontWeight: 700, fontSize: 14,
                    background: plan.popular ? T.orange : 'transparent',
                    color: plan.popular ? '#fff' : T.grey1,
                    border: plan.popular ? 'none' : `1px solid ${T.border}`,
                    transition: 'all 0.2s',
                  }}
                >
                  {plan.popular ? 'Start Free Trial' : 'Get Started'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MARKETS ─────────────────────────────────────────────────── */}
      <section id="markets" style={{ padding: '0 24px 100px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.orange, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
              Markets
            </div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800, letterSpacing: '-1.5px' }}>
              Built for India &amp; GCC
            </h2>
          </div>

          <div className="markets-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14 }}>
            {MARKETS.map(({ flag, name, pay, lang }) => (
              <div key={name} className="market-card">
                <div style={{ fontSize: 36, marginBottom: 14 }}>{flag}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: T.white, marginBottom: 8 }}>{name}</div>
                <div style={{ fontSize: 12, color: T.orange, fontWeight: 600, marginBottom: 4 }}>{pay}</div>
                <div style={{ fontSize: 12, color: T.grey2 }}>{lang}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ─────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 100px' }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 20,
          padding: '80px 32px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Orange glow */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 500, height: 300,
            background: 'radial-gradient(ellipse at center, rgba(255,107,53,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.orange, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>
              Ready to launch?
            </div>
            <h2 style={{ fontSize: 'clamp(28px,5vw,52px)', fontWeight: 900, letterSpacing: '-2px', marginBottom: 16 }}>
              Start selling online today
            </h2>
            <p style={{ fontSize: 16, color: T.grey1, marginBottom: 36, maxWidth: 480, margin: '0 auto 36px' }}>
              Join 500+ businesses across India and GCC already using Souqly to sell, deliver, and grow.
            </p>
            <Link href="/signup" className="btn-orange-lg">
              Create your free store →
            </Link>
            <div style={{ marginTop: 20, fontSize: 13, color: T.grey2 }}>
              No credit card needed &nbsp;·&nbsp; Free plan available &nbsp;·&nbsp; Live in 30 minutes
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${T.border}`, padding: '48px 24px', background: '#050505' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, justifyContent: 'space-between', marginBottom: 40 }}>
            {/* Brand */}
            <div style={{ maxWidth: 280 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, background: T.orange, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontWeight: 900, fontSize: 14 }}>S</span>
                </div>
                <span style={{ fontWeight: 800, fontSize: 16 }}>Souqly</span>
              </div>
              <p style={{ fontSize: 13, color: T.grey2, lineHeight: 1.65, marginBottom: 12 }}>
                White-label ordering platform for small businesses in India and GCC.
              </p>
              <p style={{ fontSize: 12, color: T.grey2 }}>FaizeCart Online Services OPC Pvt. Ltd.</p>
              <p style={{ fontSize: 12, color: T.grey2 }}>GSTIN: 32AAFCF7417G1ZU · Kochi, Kerala</p>
              <p style={{ fontSize: 12, color: T.grey2, marginTop: 8 }}>Made with ❤️ for India &amp; GCC</p>
            </div>

            {/* Links */}
            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.grey1, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Product</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {['Features', 'Pricing', 'Demo Store'].map(l => (
                    <a key={l} href="#" className="footer-link">{l}</a>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.grey1, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Legal</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {['Privacy', 'Terms', 'Contact'].map(l => (
                    <a key={l} href="#" className="footer-link">{l}</a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 12, color: T.grey2 }}>&copy; 2026 Souqly by FaizeCart Online Services OPC Pvt. Ltd.</span>
            <span style={{ fontSize: 12, color: T.grey2 }}>All rights reserved.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
