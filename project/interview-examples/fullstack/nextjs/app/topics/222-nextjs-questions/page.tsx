// Topic 222: Next.js Questions  (Full-Stack Handbook, Part 11)
// Run: npm run ex 222        (open: /topics/222-nextjs-questions)
// What it shows: Server vs Client Component (orders read on the server, sorted by a client table),
// how to pick SSR/SSG/ISR, and links to the other answers: hydration errors (./hydration), protecting
// routes (topics 188 + 190), Server Action checks (186) and stale data after mutations (185).
import Link from 'next/link';
import { db } from '@/lib/db';
import OrderTable from './OrderTable';

export default async function Orders() {
  const orders = [...(await db.order.findByUser('u1', 1) ?? []), ...(await db.order.findByUser('u2', 1) ?? [])];
  return (
    <main>
      <h1>Topic 222: Next.js questions</h1>
      <h2>Server Component vs Client Component?</h2>
      <p>This page reads the db on the server and ships no JS for that; the table needs sorting state, so it is a Client Component.</p>
      <OrderTable orders={orders} />
      <h2>How do you choose SSR, SSG or ISR?</h2>
      <ul>
        <li>SSG for content that rarely changes: <code>export const dynamic = &apos;force-static&apos;</code></li>
        <li>ISR for content that may be a little stale: <code>export const revalidate = 300</code></li>
        <li>SSR for personalised / must-be-fresh pages: read <code>cookies()</code> or use <code>no-store</code></li>
      </ul>
      <p>See <Link href="/topics/172-rendering-strategies">topic 172</Link> for all four running side by side.</p>
      <h2>Other answers</h2>
      <ul>
        <li><Link href="/topics/222-nextjs-questions/hydration">What is a hydration error and how do you fix it?</Link></li>
        <li>How do you protect a route? <Link href="/topics/188-middleware">proxy redirect (188)</Link> plus <Link href="/topics/190-authentication/admin">server check (190)</Link></li>
        <li>What must you remember about Server Actions? <Link href="/topics/186-server-actions">auth + validation in every action (186)</Link></li>
        <li>Why did my data not update after a mutation? <Link href="/topics/185-on-demand-revalidation">revalidateTag / revalidatePath (185)</Link></li>
      </ul>
    </main>
  );
}
