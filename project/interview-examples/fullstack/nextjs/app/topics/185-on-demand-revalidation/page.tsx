// Topic 185: Cache Invalidation (On-Demand Revalidation)  (Full-Stack Handbook, Part 9)
// Run: npm run ex 185        (open: /topics/185-on-demand-revalidation)
// What it shows: a static page whose product list comes from unstable_cache tagged 'products'.
// Changing the db directly (PATCH /api/products/1) does NOT update it: the data is cached.
// Two ways to refresh it: the form's Server Action (updateTag + revalidatePath), or a webhook
// POST /api/revalidate with the x-secret header (revalidateTag + revalidatePath).
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import { updatePrice } from './actions';

const getProducts = unstable_cache(() => db.product.findMany(), ['products-185'], { tags: ['products'] });

export default async function Page() {
  const products = await getProducts();
  return (
    <main>
      <h1>Topic 185: On-demand revalidation</h1>
      <p>Page generated at: <code data-k="generated-at">{new Date().toISOString()}</code></p>
      <ul>
        {products.map((p) => (
          <li key={p.id}>{p.name}: Rs. <span data-k={`price-${p.id}`}>{p.price}</span></li>
        ))}
      </ul>
      {/* A plain <form action={serverAction}> works before JavaScript loads (progressive enhancement). */}
      <form action={updatePrice}>
        <label>Product id <input name="id" type="number" defaultValue={1} min={1} /></label>{' '}
        <label>New price <input name="price" type="number" defaultValue={2600} min={1} /></label>{' '}
        <button type="submit">Update price</button>
      </form>
      <pre>{`# Webhook from a CMS (Next 16: revalidateTag needs a profile; { expire: 0 } = refresh now)
curl -X POST -H "x-secret: demo-revalidate-secret" http://localhost:3000/api/revalidate`}</pre>
    </main>
  );
}
