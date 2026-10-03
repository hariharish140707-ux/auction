import type { Metadata } from 'next';
import './globals.css';
import { APP_BRAND_NAME } from '@ipl-auction/shared';

export const metadata: Metadata = {
  title: `${APP_BRAND_NAME} - Real-time Multiplayer Cricket Auction`,
  description:
    'Play real-time IPL cricket auction with friends in private rooms. Fast, responsive, and production ready.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0B0F19] text-slate-100 antialiased min-h-screen">{children}</body>
    </html>
  );
}
