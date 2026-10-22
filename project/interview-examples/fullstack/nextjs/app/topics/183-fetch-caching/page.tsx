// Topic 183: Fetch Caching Behaviour  (Full-Stack Handbook, Part 9)
// Run: npm run ex 183        (open: /topics/183-fetch-caching, reload a few times)
// What it shows: the same counting endpoint (/api/counter) fetched with each cache option.
// Since Next 15 a plain fetch is NOT cached; force-cache and revalidate are served from the Data
// Cache, so their count stops moving. unstable_cache does the same for a db query.
import { unstable_cache } from 'next/cache';
import { baseUrl } from '@/lib/base-url';
import { db } from '@/lib/db';

type Hit = { count: number };

const getProducts = unstable_cache(
  async () => ({ count: (await db.product.findMany()).length, at: new Date().toISOString() }),
  ['products-183'],
  { revalidate: 300, tags: ['products'] },
);

export default async function Page() {
  const api = `${await baseUrl()}/api/counter?key=`; // headers() makes this page dynamic
  const get = (key: string, init?: RequestInit) => fetch(api + key, init).then((r) => r.json() as Promise<Hit>);

  const [plain, forced, noStore, revalidated, tagged, cachedDb] = await Promise.all([
    get('183-default'),                                              // Next 15+: not cached
    get('183-force', { cache: 'force-cache' }),                      // cached until revalidated
    get('183-nostore', { cache: 'no-store' }),                       // never cached
    get('183-revalidate', { next: { revalidate: 60 } }),             // cached for 60s
    get('183-tagged', { cache: 'force-cache', next: { tags: ['counter'] } }), // on-demand (topic 185)
    getProducts(),
  ]);

  const rows: [string, string, number | string][] = [
    ['fetch(url)', 'default', plain.count],
    ["{ cache: 'force-cache' }", 'force', forced.count],
    ["{ cache: 'no-store' }", 'nostore', noStore.count],
    ['{ next: { revalidate: 60 } }', 'revalidate', revalidated.count],
    ["{ next: { tags: ['counter'] } }", 'tagged', tagged.count],
  ];
  return (
    <main>
      <h1>Topic 183: Fetch caching</h1>
      <table>
        <thead><tr><th>Option</th><th>Upstream hit #</th></tr></thead>
        <tbody>
          {rows.map(([label, k, n]) => (
            <tr key={k}><td><code>{label}</code></td><td data-k={k}>{n}</td></tr>
          ))}
        </tbody>
      </table>
      <p>unstable_cache(db query) computed at: <code data-k="unstable-cache-at">{cachedDb.at}</code></p>
      <p className="note">Reload: only the default and no-store counts go up.</p>
    </main>
  );
}
