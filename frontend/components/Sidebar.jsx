'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, ShoppingBag, Package, Bike, BarChart2,
  Tag, Star, GitBranch, MessageCircle, Megaphone, FileText,
  TrendingUp, CreditCard, Settings, LogOut, Store, ChevronRight, Image, Palette, Monitor
} from 'lucide-react';

const NAV = [
  { href: '/dashboard',            label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/dashboard/orders',     label: 'Orders',       icon: ShoppingBag },
  { href: '/dashboard/products',   label: 'Products',     icon: Package },
  { href: '/dashboard/banners',    label: 'Banners',      icon: Image },
  { href: '/dashboard/themes',     label: 'Themes',       icon: Palette },
  { href: '/dashboard/pos',        label: 'POS',          icon: Monitor },
  { href: '/dashboard/riders',     label: 'Riders',       icon: Bike },
  { href: '/dashboard/analytics',  label: 'Analytics',    icon: BarChart2 },
  { href: '/dashboard/coupons',    label: 'Coupons',      icon: Tag },
  { href: '/dashboard/reviews',    label: 'Reviews',      icon: Star },
  { href: '/dashboard/branches',   label: 'Branches',     icon: GitBranch },
  { href: '/dashboard/whatsapp',   label: 'WhatsApp Bot', icon: MessageCircle },
  { href: '/dashboard/marketing',  label: 'Marketing',    icon: Megaphone },
  { href: '/dashboard/invoices',   label: 'Invoices',     icon: FileText },
  { href: '/dashboard/reports',    label: 'Reports',      icon: TrendingUp },
  { href: '/dashboard/billing',    label: 'Billing',      icon: CreditCard },
  { href: '/dashboard/settings',   label: 'Settings',     icon: Settings },
];

export default function Sidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const [shop, setShop] = useState(null);

  useEffect(() => {
    const s = localStorage.getItem('souqly_shop');
    if (s) setShop(JSON.parse(s));
  }, []);

  const logout = () => { localStorage.clear(); router.push('/login'); };

  const isActive = (href) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <aside style={{
      width: 220,
      flexShrink: 0,
      background: '#0a0a0a',
      borderRight: '1px solid #1f1f1f',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px', borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: '#FF6B35', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(255,107,53,0.35)', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 15 }}>S</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shop?.name || 'Souqly'}</div>
          <div style={{ fontSize: 11, color: '#606060', textTransform: 'capitalize', marginTop: 1 }}>{shop?.plan || 'free'} plan</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 9,
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? '#FF6B35' : '#606060',
                background: active ? 'rgba(255,107,53,0.1)' : 'transparent',
                transition: 'all 0.15s',
                textDecoration: 'none',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#111'; e.currentTarget.style.color = '#a0a0a0'; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#606060'; }}}
            >
              <Icon size={15} style={{ flexShrink: 0, color: active ? '#FF6B35' : '#3a3a3a' }} />
              <span style={{ flex: 1 }}>{label}</span>
              {active && <ChevronRight size={12} style={{ color: '#FF6B35', opacity: 0.6 }} />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '10px 10px 16px', borderTop: '1px solid #1f1f1f', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {shop?.slug && (
          <Link
            href={`/store/${shop.slug}`}
            target="_blank"
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, fontSize: 13, color: '#606060', textDecoration: 'none', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#111'; e.currentTarget.style.color = '#a0a0a0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#606060'; }}
          >
            <Store size={15} style={{ flexShrink: 0, color: '#3a3a3a' }} />
            <span>View My Store</span>
          </Link>
        )}
        <button
          onClick={logout}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, fontSize: 13, color: '#606060', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: "'Inter', sans-serif", transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#606060'; }}
        >
          <LogOut size={15} style={{ flexShrink: 0 }} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
