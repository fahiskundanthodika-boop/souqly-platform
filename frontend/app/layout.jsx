// Root layout - wraps every page with fonts, toast notifications, etc.
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Souqly - Smart Ordering for Your Business',
  description: 'White-label ordering platform for small businesses in India and GCC. Powered by FaizeCart Online Services OPC Pvt Ltd.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Toast notifications appear here (top-right corner) */}
        <Toaster
          position="top-right"
          toastOptions={{
            success: { style: { background: '#FF6B35', color: 'white' } },
            error: { style: { background: '#ef4444', color: 'white' } },
          }}
        />
        {children}
      </body>
    </html>
  );
}
