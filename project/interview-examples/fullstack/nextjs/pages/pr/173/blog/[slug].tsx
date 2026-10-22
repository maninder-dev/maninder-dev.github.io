// Topic 173: File-Based Routing (Pages Router)  (Full-Stack Handbook, Part 9)
// Run: npm run ex 173        (open: /pr/173/blog/hello-world)
// What it shows: pages/pr/173/blog/[slug].tsx is a dynamic route; useRouter().query holds the slug.
// Siblings: docs/[...path].tsx (catch-all), shop/[[...filters]].tsx (optional catch-all),
// pages/api/pr/users.ts (API route). /pr is a prefix so these do not clash with app/ routes.
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Post() {
  const { query, isReady } = useRouter();
  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 820, margin: '0 auto', padding: '0 16px' }}>
      <h1>Topic 173: Pages Router dynamic route</h1>
      {/* No data fetching method, so this page is prerendered once and query is filled in after hydration. */}
      <p>Post: {isReady ? String(query.slug) : '(router not ready yet: static optimisation)'}</p>
      <ul>
        <li><Link href="/pr/173/docs/a/b/c">/pr/173/docs/a/b/c</Link> (catch-all)</li>
        <li><Link href="/pr/173/shop">/pr/173/shop</Link> and <Link href="/pr/173/shop/x/y">/pr/173/shop/x/y</Link> (optional catch-all)</li>
        <li><a href="/api/pr/users">/api/pr/users</a> (API route)</li>
      </ul>
    </main>
  );
}
