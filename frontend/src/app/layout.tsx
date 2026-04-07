import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'AdGen AI — AI-Powered Video Ad Generator',
  description:
    'Transform product images into stunning cinematic marketing videos in seconds using AI.',
  keywords: ['AI', 'video generation', 'marketing', 'ad generator', 'product video'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen font-sans">
        {/* Ambient background glow */}
        <div className="ambient-glow" />

        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0B0F0C',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px',
              fontFamily: '"Space Grotesk", sans-serif',
            },
            success: {
              iconTheme: {
                primary: '#A3FF12',
                secondary: '#0B0F0C',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#0B0F0C',
              },
            },
          }}
        />

        {/* Main content */}
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}
