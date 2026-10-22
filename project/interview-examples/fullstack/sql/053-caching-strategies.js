// Topic 53: Caching Strategies for SQL Databases  (Full-Stack Handbook, Part 2)
// Run: npm run ex 53       (or: node 053-caching-strategies.js)
// What it shows: cache-aside, write-through (the handbook's updatePrice), write-behind (fast, but
// writes are lost if the process dies before the flush) and a summary table for an expensive
// aggregate. PostgreSQL via PGlite, Redis via ioredis-mock.
import assert from 'node:assert/strict';
import Redis from 'ioredis-mock';
import { createDb, one, heading, show } from './lib/db.js';

const db = await createDb();
const redis = new Redis();
await db.exec(`
  CREATE TABLE products (id INT PRIMARY KEY, price NUMERIC(10,2) NOT NULL, views INT NOT NULL DEFAULT 0);
  INSERT INTO products SELECT g, 10 + g % 90, 0 FROM generate_series(1, 1000) g;
`);
let dbReads = 0;
const priceFromDb = async (id) => { dbReads++; return (await one(db, 'SELECT price FROM products WHERE id = $1', [id])).price; };

heading('Cache-aside (lazy loading): app checks Redis, falls back to the DB, fills the cache');
async function getPrice(id) {
  const key = `product:${id}:price`;
  const hit = await redis.get(key);
  if (hit !== null) return hit;
  const price = await priceFromDb(id);
  await redis.set(key, price, 'EX', 300);
  return price;
}
await getPrice(1); await getPrice(1); await getPrice(1);
show('3 reads -> DB reads', dbReads);
assert.equal(dbReads, 1);

heading('Write-through: update DB and cache together, reads stay warm and correct');
async function updatePrice(id, price) {
  await db.query('UPDATE products SET price = $1 WHERE id = $2', [price, id]);
  await redis.set(`product:${id}:price`, price);
}
await updatePrice(1, '99.00');
show('price served after update', await getPrice(1));
assert.equal(await getPrice(1), '99.00');
assert.equal(dbReads, 1, 'still no extra DB read');

heading('Write-behind: count views in Redis, flush to the DB in batches');
for (let i = 0; i < 500; i++) await redis.hincrby('pending:views', String(1 + (i % 5)), 1);
show('DB views before flush', (await one(db, 'SELECT sum(views)::int AS s FROM products')).s);
async function flushViews() {
  const pending = await redis.hgetall('pending:views');
  await redis.del('pending:views');
  await db.transaction(async (tx) => {
    for (const [id, n] of Object.entries(pending)) await tx.query('UPDATE products SET views = views + $1 WHERE id = $2', [+n, +id]);
  });
  return Object.keys(pending).length;
}
const updates = await flushViews();
const total = (await one(db, 'SELECT sum(views)::int AS s FROM products')).s;
show('500 view events became UPDATE statements', updates);
show('DB views after flush', total);
assert.equal(total, 500);
assert.equal(updates, 5);
console.log('  Risk: if the process dies before flushViews(), those counts are gone.');

heading('Summary table for an expensive aggregate (refresh on a schedule)');
await db.exec(`CREATE TABLE price_bands AS
  SELECT width_bucket(price, 0, 100, 4) AS band, count(*)::int AS products FROM products GROUP BY 1 ORDER BY 1`);
const bands = (await db.query('SELECT * FROM price_bands')).rows;
show('price_bands', bands);
assert.equal(bands.reduce((s, b) => s + b.products, 0), 1000);
console.log('\nLayer zero is free: the DB already caches hot pages (shared_buffers / InnoDB buffer pool).');

redis.disconnect();
await db.close();
console.log('\nOK');
