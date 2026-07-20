import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import './globals.css';

const brandFont = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-brand',
});

const APP_TITLE = 'Advanced Brewing Calculator';
const APP_DESCRIPTION =
  'A pro-tier brewing formulation, specification, and compare engine. Recipe → ingredient quantities, gravity, color, IBU, RDF, brewhouse efficiency and the OPSTD operating standard. All figures are estimates for planning.';

export const metadata: Metadata = {
  metadataBase: new URL(
    'https://ankurnapa.github.io/advanced-brewing-calculator/',
  ),
  title: APP_TITLE,
  description: APP_DESCRIPTION,
  manifest: 'manifest.webmanifest',
  icons: {
    icon: [
      { url: 'favicon.ico', sizes: 'any' },
      { url: 'icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: 'icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Adv Brew Calc' },
  openGraph: {
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    url: '/',
    siteName: APP_TITLE,
    images: [{ url: 'og-image.png', width: 1200, height: 630, alt: APP_TITLE }],
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: APP_TITLE, description: APP_DESCRIPTION },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#e08b2d',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={brandFont.variable}>
      <body className="min-h-screen bg-parchment font-body text-ink">{children}</body>
    </html>
  );
}
