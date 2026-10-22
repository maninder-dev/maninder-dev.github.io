// Topic 35: Query Caching  (Full-Stack Handbook, Part 2)
// Run: npm run ex 35       (or: node 035-query-caching.js)
// What it shows: PostgreSQL has no result cache, so the handbook's getTopProducts() caches the
// result in Redis (ioredis-mock here) for 60 s. First call hits the database, later calls don't,
// and the entry expires on its TTL.
import assert from 'node:assert/strict';
import Redis from 'ioredis-mock';
import { createDb, heading, show } from './lib/db.js';

const db = await createDb();
const redis = new Redis();
await db.exec(`
  CREATE TABLE products (id SERIAL PRIMARY KEY, name TEXT NOT NULL, sales INT NOT NULL);
  INSERT INTO products (name, sales) SELECT 'Product ' || g, (g * 7919) % 100000 FROM generate_series(1, 50000) g;
`);
let dbQueries = 0;
const pool = { query: (sql, p) => { dbQueries++; return db.query(sql, p); } };

async function getTopProducts() {
  const hit = await redis.get('top_products');
  if (hit) return JSON.parse(hit);
  const { rows } = await pool.query('SELECT id, name FROM products ORDER BY sales DESC LIMIT 10');
  await redis.set('top_products', JSON.stringify(rows), 'EX', 60);
  return rows;
}

heading('Three calls');
const timings = [];
for (let i = 0; i < 3; i++) {
  const t = performance.now();
  const rows = await getTopProducts();
  timings.push((performance.now() - t).toFixed(2));
  assert.equal(rows.length, 10);
}
show('ms per call (miss, hit, hit)', timings);
show('database queries', dbQueries);
assert.equal(dbQueries, 1);
show('TTL left (s)', await redis.ttl('top_products'));
assert.ok((await redis.ttl('top_products')) > 0);

heading('Staleness: the cache doesn\'t know the data changed');
await db.query(`UPDATE products SET sales = 1000000 WHERE id = 1`);
const cached = await getTopProducts();
show('top product from cache', cached[0].name);
assert.notEqual(cached[0].name, 'Product 1');
await redis.del('top_products'); // invalidate on write (or wait for the TTL)
const fresh = await getTopProducts();
show('after invalidation', fresh[0].name);
assert.equal(fresh[0].name, 'Product 1');
assert.equal(dbQueries, 2);
console.log('\nPostgreSQL caches pages (shared_buffers + OS cache), not results. MySQL removed its');
console.log('query cache in 8.0 because every write to a table invalidated all cached results for it.');

redis.disconnect();
await db.close();
console.log('\nOK');
