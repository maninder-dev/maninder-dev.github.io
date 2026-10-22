// Topic 172: CSR vs SSR vs SSG vs ISR  (Full-Stack Handbook, Part 9)
// Run: npm run ex 172        (open: /topics/172-rendering-strategies)
// What it shows: four sub-pages, one per strategy, each printing when its HTML was generated.
// Reload them: SSG never changes, SSR changes every time, ISR changes at most every 5 seconds,
// CSR's HTML has no time at all (the browser fetches it).
import Link from 'next/link';

export default function Page() {
  return (
    <main>
      <h1>Topic 172: CSR vs SSR vs SSG vs ISR</h1>
      <table>
        <thead><tr><th>Strategy</th><th>HTML built</th><th>Route segment config</th><th>Demo</th></tr></thead>
        <tbody>
          <tr><td>SSG</td><td>at build time</td><td><code>dynamic = &apos;force-static&apos;</code></td><td><Link href="/topics/172-rendering-strategies/static">static</Link></td></tr>
          <tr><td>SSR</td><td>every request</td><td><code>dynamic = &apos;force-dynamic&apos;</code></td><td><Link href="/topics/172-rendering-strategies/dynamic">dynamic</Link></td></tr>
          <tr><td>ISR</td><td>build + background refresh</td><td><code>revalidate = 5</code></td><td><Link href="/topics/172-rendering-strategies/isr">isr</Link></td></tr>
          <tr><td>CSR</td><td>in the browser</td><td><code>&apos;use client&apos;</code> + useEffect</td><td><Link href="/topics/172-rendering-strategies/csr">csr</Link></td></tr>
        </tbody>
      </table>
      <p className="note">
        In the App Router the strategy follows from what the page uses: <code>fetch(url, {'{'} cache: &apos;force-cache&apos; {'}'})</code> keeps
        it static, <code>no-store</code>, <code>cookies()</code> or <code>headers()</code> make it dynamic, and
        <code> next: {'{'} revalidate: N {'}'}</code> gives ISR.
      </p>
    </main>
  );
}
