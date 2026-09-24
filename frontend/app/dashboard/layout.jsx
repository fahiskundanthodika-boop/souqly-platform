'use client';
import { useEffect } from 'react';

export default function DashboardLayout({ children }) {
  useEffect(() => {
    document.body.style.cssText = 'background:#f9fafb !important;color:#111827 !important;';
    document.documentElement.style.cssText = 'background:#f9fafb !important;';
    return () => {
      document.body.style.cssText = '';
      document.documentElement.style.cssText = '';
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', color: '#111827', display: 'flex' }}>
      {children}
    </div>
  );
}
