// Topic 176: Streaming with Suspense  (Full-Stack Handbook, Part 9)
// Run: npm run ex 176        (open: /topics/176-streaming-suspense)
// What it shows: the shell and fast product details arrive at once; the slow reviews (1.2s db call)
// stream into the same response later, replacing the Suspense fallback. The check script times
// the chunks to prove the fallback arrives well before the reviews.
import { Suspense } from 'react';
import { connection } from 'next/server';
import { db } from '@/lib/db';

export default async function ProductPage() {
  await connection(); // per-request render so streaming happens on every visit
  const started = Date.now();
  return (
    <main>
      <h1>Topic 176: Streaming with Suspense</h1>
      <ProductDetails id={1} />
      <Suspense fallback={<p>Loading reviews...</p>}>
        <Reviews id={1} started={started} />
      </Suspense>
    </main>
  );
}

async function ProductDetails({ id }: { id: number }) {
  const p = await db.product.findUnique(id); // fast (50ms)
  return <h2>{p?.name}: Rs. {p?.price}</h2>;
}

async function Reviews({ id, started }: { id: number; started: number }) {
  const reviews = await db.review.findByProduct(id); // slow (1200ms)
  return (
    <section>
      <h3>Reviews (streamed after {Date.now() - started} ms)</h3>
      <ul>{reviews.map((r) => <li key={r.id}>{r.text}</li>)}</ul>
    </section>
  );
}
