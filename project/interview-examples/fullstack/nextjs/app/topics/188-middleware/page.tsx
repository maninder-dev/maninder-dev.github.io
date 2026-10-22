// Topic 188: Middleware (proxy.ts)  (Full-Stack Handbook, Part 9)
// Run: npm run ex 188        (open: /topics/188-middleware)
// What it shows: links to the three behaviours implemented in /proxy.ts.
import Link from 'next/link';
import { headers } from 'next/headers';

export default async function Page() {
  const requestId = (await headers()).get('x-request-id');
  return (
    <main>
      <h1>Topic 188: Middleware (proxy.ts in Next 16)</h1>
      <p>This request&apos;s id (set by proxy.ts): <code data-k="request-id">{requestId}</code></p>
      <ul>
        <li><Link href="/topics/188-middleware/dashboard">Dashboard</Link>: redirects to login without a session cookie</li>
        <li><Link href="/topics/188-middleware/pricing">Pricing</Link>: A/B rewrite to variant a or b (sticky via the <code>ab</code> cookie)</li>
      </ul>
      <p className="note">Proxy is for fast, optimistic checks. It is not a security boundary: verify auth again in
        Server Components, Server Actions and Route Handlers.</p>
    </main>
  );
}
