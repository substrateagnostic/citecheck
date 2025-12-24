import type { Metadata, Viewport } from 'next';
import './globals.css';
import { HolidayDecorator } from '@/components/HolidayDecorator';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf8f5' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1419' },
  ],
};

export const metadata: Metadata = {
  title: 'CiteCheck — Legal Citation Verification',
  description: 'Verify AI-generated legal citations against court databases. Protect yourself from sanctions and malpractice claims. Catch hallucinated case law before filing.',
  keywords: ['legal citation', 'citation verification', 'AI hallucination', 'legal research', 'court cases', 'Bluebook', 'CourtListener'],
  authors: [{ name: 'CiteCheck' }],
  creator: 'CiteCheck',
  publisher: 'CiteCheck',
  robots: 'index, follow',
  openGraph: {
    title: 'CiteCheck — Legal Citation Verification',
    description: 'Verify AI-generated legal citations against court databases. Protect yourself from sanctions.',
    type: 'website',
    locale: 'en_US',
    siteName: 'CiteCheck',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CiteCheck — Legal Citation Verification',
    description: 'Verify AI-generated legal citations against court databases.',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased min-h-screen bg-legal-cream dark:bg-dark-bg transition-colors duration-300">
        <HolidayDecorator />
        {children}
      </body>
    </html>
  );
}
