// Topic 16: What is PostgreSQL?  (Full-Stack Handbook, Part 2)
// Run: npm run ex 16       (or: node 016-what-is-postgresql.js)
// What it shows: a tour of the features the handbook lists - JSONB containment, CTEs, window
// functions, full-text search, 8 KB pages and the WAL position moving forward on every write.
import assert from 'node:assert/strict';
import { createDb, all, one, heading, show } from './lib/db.js';

const db = await createDb();
show('version', (await one(db, 'SELECT version()')).version.split(' on ')[0]);
await db.exec(`
  CREATE TABLE products (id SERIAL PRIMARY KEY, data JSONB NOT NULL, description TEXT);
  INSERT INTO products (data, description) VALUES
    ('{"name": "MacBook Air", "category": "laptop", "price": 1199}', 'Light laptop with a long battery life'),
    ('{"name": "ThinkPad X1", "category": "laptop", "price": 1499}', 'Business laptop, great keyboard'),
    ('{"name": "iPhone 17",   "category": "phone",  "price": 999}',  'Phone with a great camera'),
    ('{"name": "Pixel 10",    "category": "phone",  "price": 799}',  'Phone with clean Android');
`);

heading('JSONB containment (@>)');
const laptops = await all(db, `SELECT id, data->>'name' AS name FROM products WHERE data @> '{"category": "laptop"}' ORDER BY id`);
show('laptops', laptops);
assert.deepEqual(laptops.map((r) => r.name), ['MacBook Air', 'ThinkPad X1']);

heading('CTE + window function: rank by price inside each category');
const ranked = await all(db, `
  WITH p AS (SELECT data->>'category' AS category, data->>'name' AS name, (data->>'price')::int AS price FROM products)
  SELECT category, name, price, rank() OVER (PARTITION BY category ORDER BY price DESC) AS rnk
  FROM p ORDER BY category, rnk`);
ranked.forEach((r) => console.log('   ', r));
assert.equal(ranked.find((r) => r.rnk === 1 && r.category === 'phone').name, 'iPhone 17');

heading('Full-text search');
const fts = await all(db, `SELECT data->>'name' AS name FROM products
  WHERE to_tsvector('english', description) @@ to_tsquery('english', 'great & keyboard')`);
show('"great & keyboard"', fts);
assert.deepEqual(fts.map((r) => r.name), ['ThinkPad X1']);

heading('Storage: 8 KB heap pages, every change written to the WAL first');
show('block_size', (await one(db, 'SHOW block_size')).block_size);
const lsn1 = (await one(db, 'SELECT pg_current_wal_lsn()::text AS l')).l;
await db.query(`INSERT INTO products (data) SELECT jsonb_build_object('name', 'item ' || g) FROM generate_series(1, 1000) g`);
const lsn2 = (await one(db, 'SELECT pg_current_wal_lsn()::text AS l')).l;
const bytes = (await one(db, `SELECT pg_wal_lsn_diff('${lsn2}', '${lsn1}')::int AS b`)).b;
show('WAL position', `${lsn1} -> ${lsn2} (${bytes} bytes of WAL for 1000 inserts)`);
assert.ok(bytes > 0);

await db.close();
console.log('\nOK');
