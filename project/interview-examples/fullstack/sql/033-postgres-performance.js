// Topic 33: PostgreSQL Performance Best Practices  (Full-Stack Handbook, Part 2)
// Run: npm run ex 33       (or: node 033-postgres-performance.js)
// What it shows: (1) an unindexed foreign key makes "orders of a user" a Seq Scan - index it;
// (2) work_mem decides whether a sort spills to disk; (3) the memory settings; (4) a home-made
// pg_stat_statements (the real extension isn't bundled with PGlite) ranking queries by total time.
import assert from 'node:assert/strict';
import { createDb, all, explain, heading, show } from './lib/db.js';
import { seedShop } from './lib/seed.js';

const db = await createDb();
await seedShop(db, { users: 5000, orders: 100000 });

heading('1. Index foreign keys used in joins and WHERE');
const q = 'SELECT o.* FROM users u JOIN orders o ON o.user_id = u.id WHERE u.id = 42';
const before = await explain(db, q);
show('plan before', before);
assert.match(before, /Seq Scan on orders/);
await db.exec('CREATE INDEX idx_orders_user_id ON orders(user_id); ANALYZE orders;');
const after = await explain(db, q);
show('plan after CREATE INDEX ON orders(user_id)', after);
assert.match(after, /idx_orders_user_id/);

heading('2. work_mem: per-sort memory; too small and sorts spill to disk');
const sortSql = 'SELECT * FROM orders ORDER BY total DESC, created_at';
await db.query(`SET work_mem = '1MB'`);
const small = (await explain(db, sortSql, 'ANALYZE, TIMING OFF')).match(/Sort Method: .*/)[0];
await db.query(`SET work_mem = '64MB'`);
const big = (await explain(db, sortSql, 'ANALYZE, TIMING OFF')).match(/Sort Method: .*/)[0];
show('work_mem 1MB ', small);
show('work_mem 64MB', big);
assert.match(small, /external merge\s+Disk/);
assert.match(big, /quicksort\s+Memory/);
await db.query('RESET work_mem');

heading('3. Memory settings to know');
const settings = await all(db, `SELECT name, current_setting(name) AS value FROM pg_settings
  WHERE name IN ('shared_buffers', 'work_mem', 'effective_cache_size', 'maintenance_work_mem') ORDER BY name`);
settings.forEach((s) => console.log(`    ${s.name.padEnd(22)} ${s.value}`));
console.log('    Rule of thumb: shared_buffers ~25% of RAM; work_mem is per sort/hash node, per query.');

heading('4. Find heavy queries by total time (what pg_stat_statements gives you)');
const stats = new Map();
async function tracked(sql, params) {
  const key = sql.replace(/\$\d+/g, '?');
  const t = performance.now();
  const r = await db.query(sql, params);
  const s = stats.get(key) ?? { query: key, calls: 0, total_ms: 0 };
  s.calls++; s.total_ms += performance.now() - t; stats.set(key, s);
  return r;
}
for (let i = 1; i <= 200; i++) await tracked('SELECT * FROM users WHERE id = $1', [i]);
for (let i = 0; i < 5; i++) await tracked(`SELECT status, count(*), sum(total) FROM orders WHERE created_at > $1 GROUP BY status`, ['2026-02-01']);
for (let i = 1; i <= 50; i++) await tracked('SELECT * FROM orders WHERE user_id = $1', [i]);
const top = [...stats.values()].sort((a, b) => b.total_ms - a.total_ms)
  .map((s) => ({ ...s, total_ms: +s.total_ms.toFixed(1), mean_ms: +(s.total_ms / s.calls).toFixed(2) }));
console.table(top);
assert.equal(top.length, 3);
console.log('Real server: CREATE EXTENSION pg_stat_statements; SELECT query, calls, mean_exec_time, total_exec_time');
console.log('             FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;');
console.log('Also: pool connections (topic 34) and keep autovacuum healthy (topics 31-32).');

await db.close();
console.log('\nOK');
