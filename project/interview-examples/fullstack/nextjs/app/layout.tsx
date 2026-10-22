// Topic 171/174: the root layout (html + body) wraps every App Router page and persists across
// navigation. The local font from lib/fonts.ts (topic 189) is applied here once for the whole app.
import type { Metadata } from 'next';
import Link from 'next/link';
import { inter } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Next.js interview examples', template: '%s | Next.js examples' },
  description: 'Full-Stack Handbook topics 171-190 and 222',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <header className="site">
          <Link href="/">Next.js interview examples</Link>
        </header>
        {children}
      </body>
    </html>
  );
}
