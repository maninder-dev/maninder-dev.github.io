// Topic 22: The Query Planner  (Full-Stack Handbook, Part 2)
// Run: npm run ex 22       (or: node 022-query-planner.js)
// What it shows: the planner's row estimates come from ANALYZE statistics. With stale stats it
// guesses badly (and picks the wrong plan); after ANALYZE estimates match reality. Also pg_stats.
import assert from 'node:assert/strict';
import { createDb, all, explain, heading, show } from './lib/db.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE orders (id SERIAL PRIMARY KEY, status TEXT NOT NULL, user_id INT NOT NULL) WITH (autovacuum_enabled = off);
  INSERT INTO orders (status, user_id) SELECT 'paid', g % 1000 FROM generate_series(1, 20000) g;
  CREATE INDEX idx_orders_status ON orders(status);
  ANALYZE orders;
`);
const estimateVsActual = async (sql) => {
  const plan = await explain(db, sql, 'ANALYZE, TIMING OFF');
  const m = plan.match(/rows=(\d+) width.*actual rows=([\d.]+)/);
  return { plan, estimated: +m[1], actual: Math.round(+m[2]) };
};

heading('Statistics were gathered when every order was "paid"');
// A big batch of refunds lands; autovacuum is off so stats stay stale
await db.query(`INSERT INTO orders (status, user_id) SELECT 'refunded', g % 1000 FROM generate_series(1, 30000) g`);
const q = `SELECT * FROM orders WHERE status = 'refunded'`;
const stale = await estimateVsActual(q);
show('plan with stale stats', stale.plan);
show('estimated vs actual rows', `${stale.estimated} vs ${stale.actual}`);
assert.ok(stale.actual / stale.estimated > 100, 'estimate is wildly off');

heading('ANALYZE orders - refresh statistics');
await db.query('ANALYZE orders');
const fresh = await estimateVsActual(q);
show('plan with fresh stats', fresh.plan);
show('estimated vs actual rows', `${fresh.estimated} vs ${fresh.actual}`);
assert.ok(Math.abs(fresh.estimated - fresh.actual) / fresh.actual < 0.1);

heading('What the planner knows: pg_stats');
const stats = await all(db, `SELECT attname, n_distinct, most_common_vals::text, most_common_freqs::text
                             FROM pg_stats WHERE tablename = 'orders' AND attname IN ('status', 'user_id') ORDER BY attname`);
stats.forEach((s) => console.log('   ', { ...s, most_common_vals: s.most_common_vals?.slice(0, 40) }));
assert.equal(stats.find((s) => s.attname === 'status').n_distinct, 2);

heading('Stages: parse -> rewrite (views expand) -> plan -> execute');
await db.exec(`CREATE VIEW refunds AS SELECT * FROM orders WHERE status = 'refunded'`);
const viewPlan = await explain(db, 'SELECT count(*) FROM refunds WHERE user_id = 7');
show('plan for a query on a view (rewritten into the base table)', viewPlan);
assert.match(viewPlan, /on orders/);

await db.close();
console.log('\nOK');
