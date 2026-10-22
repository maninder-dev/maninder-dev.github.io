// Topic 184: Next.js Caching Layers  (Full-Stack Handbook, Part 9)
// Run: npm run ex 184        (open: /topics/184-caching-layers)
// What it shows: request memoization. Header and Sidebar both need the user; with React cache()
// the db query runs once per render, without it twice. Two identical GET fetch() calls in one
// render are also deduplicated (same upstream hit number).
// Observed quirk (Next 16.4.1): if the server's very first request is a route handler, fetch
// memoization stays off for that process; scripts/check.mjs therefore probes startup with "/".
import { cache } from 'react';
import { connection } from 'next/server';
import { baseUrl } from '@/lib/base-url';
import { db } from '@/lib/db';

const getUserById = cache((id: string) => db.user.findById(id)); // memoized for one render pass

async function Header() { const u = await getUserById('u1'); return <p>Hi {u?.name}</p>; }
async function Sidebar() { const u = await getUserById('u1'); return <p>{u?.plan} plan</p>; }

export default async function Page() {
  await connection();
  const calls = () => db.callCount('user.findById');

  let before = calls();
  await Promise.all([getUserById('u1'), getUserById('u1')]); // what Header + Sidebar do
  const memoizedCalls = calls() - before;

  before = calls();
  await Promise.all([db.user.findById('u1'), db.user.findById('u1')]); // no cache()
  const plainCalls = calls() - before;

  const url = `${await baseUrl()}/api/counter?key=184-memo`;
  const a = await fetch(url).then((r) => r.json());
  const b = await fetch(url).then((r) => r.json());
  // Memoization is not the Data Cache: even no-store fetches are shared within one render.
  const c = await fetch(`${url}-nostore`, { cache: 'no-store' }).then((r) => r.json());
  const d = await fetch(`${url}-nostore`, { cache: 'no-store' }).then((r) => r.json());

  return (
    <main>
      <h1>Topic 184: Caching layers</h1>
      <Header />
      <Sidebar />
      <p>db queries with cache(): <code data-k="memoized-calls">{memoizedCalls}</code></p>
      <p>db queries without cache(): <code data-k="plain-calls">{plainCalls}</code></p>
      <p>Two identical fetch() calls saw upstream hit <code data-k="fetch-a">{a.count}</code> and <code data-k="fetch-b">{b.count}</code>;
        with no-store: <code data-k="fetch-c">{c.count}</code> and <code data-k="fetch-d">{d.count}</code></p>
      <table>
        <thead><tr><th>Layer</th><th>Where</th><th>Stores</th><th>Lifetime</th></tr></thead>
        <tbody>
          <tr><td>Request memoization</td><td>server</td><td>identical calls in one render</td><td>one render</td></tr>
          <tr><td>Data Cache</td><td>server</td><td>fetch / unstable_cache results (topic 183)</td><td>until revalidated</td></tr>
          <tr><td>Full Route Cache</td><td>server</td><td>HTML + RSC payload of static routes (topic 172)</td><td>until revalidated / redeploy</td></tr>
          <tr><td>Router Cache</td><td>browser</td><td>RSC payload of visited routes</td><td>session; router.refresh() clears</td></tr>
        </tbody>
      </table>
    </main>
  );
}
