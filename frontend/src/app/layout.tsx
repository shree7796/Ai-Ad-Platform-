import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Lumina — AI Creative Studio',
  description: 'Generate stunning images and videos from text or images using AI.',
  keywords: ['AI', 'image generation', 'video generation', 'text to image', 'text to video'],
};

/** Ensures proper initial scale and width on phones (avoids “desktop zoomed out” layouts). */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen overflow-x-clip font-sans antialiased">
        <Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 500,
              boxShadow: 'var(--shadow-lg)',
            },
            success: {
              iconTheme: { primary: '#0a84ff', secondary: 'rgba(10,132,255,0.2)' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: 'rgba(239,68,68,0.15)' },
            },
          }}
        />
        {children}
        </Providers>
      </body>
    </html>
  );
}
