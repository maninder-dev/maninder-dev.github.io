// Topic 175: a page that takes ~1s; the sibling loading.tsx streams first.
// Run: npm run ex 175        (open: /topics/175-layouts-loading-error/slow)
import { connection } from 'next/server';
import { db } from '@/lib/db';

export default async function Slow() {
  await connection(); // render per request so the delay is visible every time
  const orders = await db.order.findByUser('u1', 1, 1000);
  return <h2>Slow page loaded: {orders?.length} orders</h2>;
}
