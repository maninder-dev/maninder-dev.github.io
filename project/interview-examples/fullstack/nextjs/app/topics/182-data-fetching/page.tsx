// Topic 182: App Router Data Fetching  (Full-Stack Handbook, Part 9)
// Run: npm run ex 182        (open: /topics/182-data-fetching)
// What it shows: three independent 300ms queries awaited one after another (~900ms waterfall)
// versus with Promise.all (~300ms), route segment config, and generateMetadata for the <title>.
import type { Metadata } from 'next';
import { db } from '@/lib/db';

// Route segment config: force-dynamic = always SSR. (`export const revalidate = 3600` would be ISR.)
export const dynamic = 'force-dynamic';

const getUser = () => db.user.findById('u1', 300);
const getOrders = () => db.order.findByUser('u1', 1, 300);
const getStats = async () => { await db.user.findById('u1', 300); return { visits: 42 }; };

export async function generateMetadata(): Promise<Metadata> {
  const user = await db.user.findById('u1', 10);
  return { title: { absolute: `Dashboard for ${user?.name} | My Shop` }, description: 'Topic 182 demo' };
}

export default async function Dashboard() {
  let t = Date.now();
  await getUser(); await getOrders(); await getStats();          // waterfall: sum of all three
  const sequentialMs = Date.now() - t;

  t = Date.now();
  const [user, orders, stats] = await Promise.all([getUser(), getOrders(), getStats()]); // slowest one
  const parallelMs = Date.now() - t;

  return (
    <main>
      <h1>Topic 182: Data fetching in Server Components</h1>
      <p>{user?.name} has {orders?.length} orders on page 1 and {stats.visits} visits.</p>
      <p>Sequential awaits: <code data-k="sequential-ms">{sequentialMs}</code> ms</p>
      <p>Promise.all: <code data-k="parallel-ms">{parallelMs}</code> ms</p>
    </main>
  );
}
