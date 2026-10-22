// Topic 95: Detecting Slow Queries  (Full-Stack Handbook, Part 5)
// Run: npm run ex 95       (or: node 095-detecting-slow-queries.js)
// What it shows: the handbook's tuning loop on 200,000 orders - (1) find: an app-side slow-query log
// (same idea as log_min_duration_statement = 50 ms), (2) EXPLAIN the worst one, (3) fix with an
// index, (4) measure again. Also the real pg_stat_activity query for live slow statements.
import assert from 'node:assert/strict';
import { createDb, all, explain, heading, show } from './lib/db.js';
import { seedShop } from './lib/seed.js';

const db = await createDb();
await seedShop(db, { users: 5000, orders: 200000 });

const SLOW_MS = 20; // the threshold you'd put in log_min_duration_statement
const slowLog = [];
async function query(sql, params) {
  const t = performance.now();
  const r = await db.query(sql, params);
  const ms = performance.now() - t;
  if (ms >= SLOW_MS) slowLog.push({ ms: +ms.toFixed(1), sql });
  return r;
}
const workload = async () => {
  for (let i = 1; i <= 20; i++) await query('SELECT * FROM users WHERE id = $1', [i]);
  for (let i = 1; i <= 5; i++) await query('SELECT id, total FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5', [i]);
};

heading('1. Find: run the workload with the slow-query log on');
await workload();
const byQuery = Object.values(Object.groupBy(slowLog, (e) => e.sql)).map((es) => ({ sql: es[0].sql, count: es.length, total_ms: +es.reduce((s, e) => s + e.ms, 0).toFixed(1) }));
console.table(byQuery);
assert.equal(byQuery.length, 1, 'only the orders-by-user query is slow');
const worst = byQuery[0].sql;

heading('2. EXPLAIN it');
const plan = await explain(db, worst.replace('$1', '3'), 'ANALYZE, TIMING OFF');
show('plan', plan);
assert.match(plan, /Seq Scan on orders/);

heading('3. Fix: index matching the WHERE + ORDER BY');
await db.exec('CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC); ANALYZE orders;');
const fixed = await explain(db, worst.replace('$1', '3'), 'ANALYZE, TIMING OFF');
show('plan', fixed);
assert.match(fixed, /idx_orders_user_created/);

heading('4. Measure again');
slowLog.length = 0;
await workload();
show('slow queries now', slowLog.length);
assert.equal(slowLog.length, 0);

heading('Live view on a server: what is running right now, longest first');
const active = await all(db, `SELECT pid, now() - query_start AS duration, state, left(query, 60) AS query
                             FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC`);
show('pg_stat_activity', active);
console.log('  Server-side logging: ALTER SYSTEM SET log_min_duration_statement = 1000; SELECT pg_reload_conf();');

await db.close();
console.log('\nOK');
