export const THEMES = {
  'classic-white':    { name: 'Classic White',     primary: '#FF6B35', background: '#f8f8f8', card: '#ffffff',  text: '#1a1a1a', header: '#FF6B35', headerText: '#ffffff', badge: '#f0f0f0', border: '#eeeeee' },
  'dark-premium':     { name: 'Dark Premium',      primary: '#FF6B35', background: '#080808', card: '#0f0f0f',  text: '#e8e8e8', header: '#0f0f0f', headerText: '#ffffff', badge: '#1f1f1f', border: '#1f1f1f' },
  'fresh-market':     { name: 'Fresh Market',      primary: '#16a34a', background: '#f0fdf4', card: '#ffffff',  text: '#1a1a1a', header: '#16a34a', headerText: '#ffffff', badge: '#dcfce7', border: '#d1fae5' },
  'medical-pro':      { name: 'Medical Pro',       primary: '#2563eb', background: '#eff6ff', card: '#ffffff',  text: '#1a1a1a', header: '#2563eb', headerText: '#ffffff', badge: '#dbeafe', border: '#bfdbfe' },
  'spice-route':      { name: 'Spice Route',       primary: '#ef4444', background: '#1a0505', card: '#2d0a0a',  text: '#ffffff', header: '#1a0505', headerText: '#ffffff', badge: '#3d0f0f', border: '#4a1515' },
  'minimal-clean':    { name: 'Minimal Clean',     primary: '#000000', background: '#ffffff', card: '#f9f9f9',  text: '#1a1a1a', header: '#ffffff', headerText: '#000000', badge: '#f0f0f0', border: '#e5e5e5' },
  'night-owl':        { name: 'Night Owl',         primary: '#00ff7f', background: '#020d05', card: '#0a1a0d',  text: '#ffffff', header: '#020d05', headerText: '#ffffff', badge: '#0f2d14', border: '#1a4020' },
  'kerala-kart':      { name: 'Kerala Kart',       primary: '#d97706', background: '#fffbeb', card: '#ffffff',  text: '#1a1a1a', header: '#d97706', headerText: '#ffffff', badge: '#fef3c7', border: '#fde68a' },
  'arabic-elegance':  { name: 'Arabic Elegance',   primary: '#b8860b', background: '#fffff0', card: '#ffffff',  text: '#1a1a1a', header: '#b8860b', headerText: '#ffffff', badge: '#fefce8', border: '#fef08a', rtl: true },
  'sweet-tooth':      { name: 'Sweet Tooth',       primary: '#ec4899', background: '#fdf2f8', card: '#ffffff',  text: '#1a1a1a', header: '#ec4899', headerText: '#ffffff', badge: '#fce7f3', border: '#fbcfe8' },
  'corporate-blue':   { name: 'Corporate Blue',    primary: '#1d4ed8', background: '#eff6ff', card: '#ffffff',  text: '#1a1a1a', header: '#1d4ed8', headerText: '#ffffff', badge: '#dbeafe', border: '#bfdbfe' },
  'sunset-glow':      { name: 'Sunset Glow',       primary: '#FF6B35', background: '#fff1f0', card: '#ffffff',  text: '#1a1a1a', header: '#FF6B35', headerText: '#ffffff', badge: '#fff0eb', border: '#ffe4d6' },
};

export function getThemeColors(themeName, overrides = {}) {
  const base = THEMES[themeName] || THEMES['classic-white'];
  return { ...base, ...overrides };
}
