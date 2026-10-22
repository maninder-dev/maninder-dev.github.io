// Topic 23: EXPLAIN and EXPLAIN ANALYZE  (Full-Stack Handbook, Part 2)
// Run: npm run ex 23       (or: node 023-explain-analyze.js)
// What it shows: the handbook's "latest 10 orders of user 42" query on 50,000 orders. Without a
// suitable index: Seq Scan + Sort. With (user_id, created_at): Limit -> Index Scan Backward.
// Also: EXPLAIN only plans, EXPLAIN ANALYZE really executes (watch out with writes).
import assert from 'node:assert/strict';
import { createDb, one, explain, heading, show } from './lib/db.js';
import { seedShop } from './lib/seed.js';

const db = await createDb();
await seedShop(db, { users: 5000, orders: 50000 });
// user 42 is a heavy buyer: 3,000 orders, so 'latest 10' really needs the index order
await db.exec(`INSERT INTO orders (user_id, status, total, created_at)
  SELECT 42, 'paid', 10 + g % 90, timestamptz '2025-01-01' + g * interval '3 hours' FROM generate_series(1, 3000) g; ANALYZE orders;`);
const sql = 'SELECT * FROM orders WHERE user_id = 42 ORDER BY created_at DESC LIMIT 10';

heading('No index on user_id');
const before = await explain(db, sql, 'ANALYZE');
show('plan', before);
assert.match(before, /Seq Scan on orders/);
assert.match(before, /Sort/);

heading('CREATE INDEX idx_orders_user_created ON orders(user_id, created_at)');
await db.exec('CREATE INDEX idx_orders_user_created ON orders(user_id, created_at); ANALYZE orders;');
const after = await explain(db, sql, 'ANALYZE');
show('plan', after);
assert.match(after, /Limit/);
assert.match(after, /Index Scan Backward using idx_orders_user_created/);
assert.doesNotMatch(after, /Sort/, 'the index already returns rows in order');
const ms = (p) => +p.match(/Execution Time: ([\d.]+)/)[1];
show('execution ms before -> after', `${ms(before)} -> ${ms(after)}`);
assert.ok(ms(after) < ms(before));

heading('Reading the numbers: estimated rows vs actual rows');
const est = await explain(db, `SELECT * FROM orders WHERE user_id = 42`, 'ANALYZE, TIMING OFF');
show('plan', est);
const [, e, a] = est.match(/rows=(\d+) width.*actual rows=([\d.]+)/);
show('estimate / actual', `${e} / ${a}`);

heading('EXPLAIN ANALYZE executes the statement - wrap writes in a rolled-back transaction');
const count = async () => (await one(db, `SELECT count(*)::int AS n FROM orders WHERE status = 'cancelled'`)).n;
const n0 = await count();
await db.query('BEGIN');
await explain(db, `UPDATE orders SET status = 'cancelled' WHERE user_id = 42`, 'ANALYZE');
await db.query('ROLLBACK');
assert.equal(await count(), n0, 'rolled back, no harm done');
await explain(db, `UPDATE orders SET status = 'cancelled' WHERE user_id = 42`, 'ANALYZE');
show('cancelled orders before / after an un-wrapped EXPLAIN ANALYZE UPDATE', `${n0} / ${await count()}`);
assert.ok((await count()) > n0, 'the update really happened');

await db.close();
console.log('\nOK');
