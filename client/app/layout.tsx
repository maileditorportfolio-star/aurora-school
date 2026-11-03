import type { Metadata, Viewport } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';

import { Providers } from './providers';
import { SiteChrome } from '@/components/layout/site-chrome';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: {
    default: 'Aurora School — Learn. Lead. Shine.',
    template: '%s | Aurora School',
  },
  description:
    'Aurora School is a grades 1–10 school in Dhaka with qualified teachers, modern labs, live attendance, report cards and safe transport — all tracked from your phone.',
  keywords: [
    'school',
    'Aurora School',
    'Dhaka school',
    'grades 1-10',
    'SSC preparation',
    'admission',
  ],
  openGraph: {
    title: 'Aurora School',
    description: 'A nurturing school where every child is known by name.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aurora School',
    description: 'A nurturing school where every child is known by name.',
  },
};

export const viewport: Viewport = {
  themeColor: '#042f2e',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-frost font-sans text-ink-900">
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
