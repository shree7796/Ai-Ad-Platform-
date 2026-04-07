import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { Inter, Montserrat } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Lumina — AI Creative Studio',
  description: 'Generate stunning images and videos from text or images using AI.',
  keywords: ['AI', 'image generation', 'video generation', 'text to image', 'text to video'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 500,
              boxShadow: 'var(--shadow-lg)',
            },
            success: {
              iconTheme: { primary: '#6366f1', secondary: '#eef2ff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fef2f2' },
            },
          }}
        />
        <main>{children}</main>
      </body>
    </html>
  );
}
