// Topic 177: React Server Components (RSC)  (Full-Stack Handbook, Part 9)
// Run: npm run ex 177        (open: /topics/177-server-components)
// What it shows: an async Server Component reading the db and a server-only secret directly,
// a Client Component for interactivity, the serializable-props rule, and passing a Server
// Component into a Client Component as children. The check script greps the browser bundles
// to prove the secret never ships.
import { db } from '@/lib/db';
import { maskedKey, PAYMENT_API_KEY } from '@/lib/secret';
import AddToCartButton from './AddToCartButton';
import Collapsible from './Collapsible';
import { addToCart } from './actions';

export default async function ProductsPage() {
  const products = await db.product.findMany(); // direct db access, no API layer
  const keyLength = PAYMENT_API_KEY.length;      // the secret is used here, on the server only
  return (
    <main>
      <h1>Topic 177: Server Components</h1>
      <ul>
        {products.map((p) => (
          <li key={p.id}>
            {p.name} - Rs. {p.price}{' '}
            {/* Props crossing into a Client Component must be serializable: numbers, strings, plain
                objects, arrays, Dates, Maps... and Server Actions (functions marked 'use server'). */}
            <AddToCartButton id={p.id} onAdd={addToCart} />
            {/* Not allowed: a plain function prop fails with
                "Functions cannot be passed directly to Client Components unless you explicitly
                expose it by marking it with "use server"".
                <AddToCartButton id={p.id} onAdd={() => console.log(p.id)} /> */}
          </li>
        ))}
      </ul>
      <p>Payment key used on the server: <code data-k="masked-key">{maskedKey()}</code> ({keyLength} chars, never sent in full)</p>
      <Collapsible title="Server-rendered details (children of a Client Component)">
        <ServerDetails />
      </Collapsible>
      <p className="note">Client Components cannot import Server Components, but a Server Component can pass one as
        <code> children</code>: it is rendered on the server and the client only receives its output.</p>
    </main>
  );
}

async function ServerDetails() {
  const count = (await db.product.findMany()).length;
  return <p>Rendered on the server: {count} products in the db.</p>;
}
