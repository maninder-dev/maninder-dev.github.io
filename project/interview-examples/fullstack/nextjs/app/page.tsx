// Home page: lists every topic route. Static (no dynamic APIs), so it is prerendered at build time.
import Link from 'next/link';
import { topics } from '@/lib/topics';

export default function Home() {
  return (
    <main>
      <h1>Next.js examples (Full-Stack Handbook, Part 9)</h1>
      <p>One route per topic. Run <code>npm run ex NNN</code> to run the checks for one topic.</p>
      <ul>
        {topics.map((t) => (
          <li key={t.n}>
            <Link href={t.href}>Topic {t.n}: {t.title}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
