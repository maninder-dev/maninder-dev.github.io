// Topic 189: Images, Fonts and Performance  (Full-Stack Handbook, Part 9)
// Run: npm run ex 189        (open: /topics/189-images-fonts)
// What it shows: next/image (resized WebP/AVIF via /_next/image, reserved space, priority for LCP),
// next/font/local (self-hosted, preloaded, no layout shift; see lib/fonts.ts), and next/dynamic with
// ssr: false (only allowed inside a Client Component, see MapLoader.tsx).
import Image from 'next/image';
import hero from '@/public/hero.png'; // static import: width/height/blur known at build time
import { inter } from '@/lib/fonts';
import MapLoader from './MapLoader';

export default function Page() {
  return (
    <main>
      <h1>Topic 189: Images, fonts and performance</h1>
      <Image src={hero} alt="Gradient hero" priority sizes="(max-width: 820px) 100vw, 820px" placeholder="blur" />
      <p className={inter.className}>This paragraph uses the self-hosted Inter font ({inter.style.fontFamily}).</p>
      <MapLoader />
      <p className="note">Also: use &lt;Link&gt; (prefetches routes), keep &apos;use client&apos; boundaries low in the tree,
        and watch Core Web Vitals (LCP, INP, CLS).</p>
    </main>
  );
}
