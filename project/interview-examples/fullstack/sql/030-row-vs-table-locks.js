// Topic 30: Row-level vs Table-level Locking  (Full-Stack Handbook, Part 2)
// Run: npm run ex 30       (or: node 030-row-vs-table-locks.js)
// What it shows: the real table-level lock modes PostgreSQL takes (from pg_locks) for UPDATE,
// LOCK TABLE ... ACCESS EXCLUSIVE, ALTER TABLE and CREATE INDEX, and the official conflict rules
// that decide who has to wait. CREATE INDEX CONCURRENTLY runs for real at the end.
import assert from 'node:assert/strict';
import { createDb, all, heading, show } from './lib/db.js';

const db = await createDb();
await db.exec(`CREATE TABLE orders (id INT PRIMARY KEY, status TEXT);
               INSERT INTO orders SELECT g, 'paid' FROM generate_series(1, 10000) g;`);

async function modesDuring(sql) {
  await db.query('BEGIN');
  await db.query(sql);
  const rows = await all(db, `SELECT DISTINCT mode FROM pg_locks WHERE relation = 'orders'::regclass ORDER BY 1`);
  await db.query('ROLLBACK');
  return rows.map((r) => r.mode);
}
const taken = {
  'UPDATE one row': await modesDuring(`UPDATE orders SET status = 'shipped' WHERE id = 5`),
  'SELECT': await modesDuring('SELECT count(*) FROM orders'),
  'CREATE INDEX': await modesDuring('CREATE INDEX ON orders(status)'),
  'ALTER TABLE ADD COLUMN': await modesDuring('ALTER TABLE orders ADD COLUMN note TEXT'),
  'LOCK TABLE ... ACCESS EXCLUSIVE': await modesDuring('LOCK TABLE orders IN ACCESS EXCLUSIVE MODE'),
};
heading('Table-level lock modes taken (real pg_locks)');
for (const [k, v] of Object.entries(taken)) console.log(`    ${k.padEnd(32)} ${v.join(', ')}`);
assert.deepEqual(taken['UPDATE one row'], ['RowExclusiveLock']);
assert.deepEqual(taken['CREATE INDEX'], ['ShareLock']);
assert.ok(taken['ALTER TABLE ADD COLUMN'].includes('AccessExclusiveLock'));

// PostgreSQL docs, "Conflicting Lock Modes" (subset).
const conflicts = {
  AccessShareLock: ['AccessExclusiveLock'],
  RowExclusiveLock: ['ShareLock', 'ShareRowExclusiveLock', 'ExclusiveLock', 'AccessExclusiveLock'],
  ShareUpdateExclusiveLock: ['ShareUpdateExclusiveLock', 'ShareLock', 'ShareRowExclusiveLock', 'ExclusiveLock', 'AccessExclusiveLock'],
  ShareLock: ['RowExclusiveLock', 'ShareUpdateExclusiveLock', 'ShareRowExclusiveLock', 'ExclusiveLock', 'AccessExclusiveLock'],
  AccessExclusiveLock: ['AccessShareLock', 'RowShareLock', 'RowExclusiveLock', 'ShareUpdateExclusiveLock', 'ShareLock', 'ShareRowExclusiveLock', 'ExclusiveLock', 'AccessExclusiveLock'],
};
const blocks = (held, wanted) => conflicts[held]?.includes(wanted) ?? false;

heading('Who waits for whom');
const pairs = [
  ['UPDATE row 5', 'RowExclusiveLock', 'UPDATE row 6', 'RowExclusiveLock'],
  ['UPDATE row 5', 'RowExclusiveLock', 'SELECT', 'AccessShareLock'],
  ['CREATE INDEX', 'ShareLock', 'UPDATE', 'RowExclusiveLock'],
  ['CREATE INDEX CONCURRENTLY', 'ShareUpdateExclusiveLock', 'UPDATE', 'RowExclusiveLock'],
  ['ALTER TABLE', 'AccessExclusiveLock', 'SELECT', 'AccessShareLock'],
];
for (const [h, hm, w, wm] of pairs) console.log(`    ${h.padEnd(26)} blocks ${w.padEnd(8)}? ${blocks(hm, wm) ? 'YES' : 'no'}`);
assert.equal(blocks('RowExclusiveLock', 'RowExclusiveLock'), false, 'different rows: no table-level conflict');
assert.equal(blocks('ShareLock', 'RowExclusiveLock'), true, 'plain CREATE INDEX blocks writes');
assert.equal(blocks('ShareUpdateExclusiveLock', 'RowExclusiveLock'), false, 'CONCURRENTLY does not');
assert.equal(blocks('AccessExclusiveLock', 'AccessShareLock'), true, 'ALTER TABLE blocks even reads');

heading('CREATE INDEX CONCURRENTLY (must run outside a transaction)');
await db.query('CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status)');
const idx = await all(db, `SELECT indexname FROM pg_indexes WHERE tablename = 'orders' ORDER BY 1`);
show('indexes', idx.map((r) => r.indexname));
assert.ok(idx.some((r) => r.indexname === 'idx_orders_status'));

await db.close();
console.log('\nOK');
