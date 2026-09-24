'use client';
import { useEffect } from 'react';

export default function DashboardLayout({ children }) {
  useEffect(() => {
    document.body.style.background = '#f9fafb';
    document.body.style.color = '#111827';
    return () => {
      document.body.style.background = '';
      document.body.style.color = '';
    };
  }, []);

  return <>{children}</>;
}
