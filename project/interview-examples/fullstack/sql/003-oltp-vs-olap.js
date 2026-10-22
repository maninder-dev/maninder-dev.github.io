// Topic 3: OLTP vs OLAP  (Full-Stack Handbook, Part 1)
// Run: npm run ex 3        (or: node 003-oltp-vs-olap.js)
// What it shows: an OLTP statement touches one row through an index; an OLAP report scans and
// aggregates all 50,000 orders. The plans and timings make the difference visible.
import assert from 'node:assert/strict';
import { createDb, all, explain, heading, show, timeIt } from './lib/db.js';
import { seedShop } from './lib/seed.js';

const db = await createDb();
await seedShop(db, { users: 5000, orders: 50000 });

heading('OLTP: update one order by primary key');
const oltpSql = `UPDATE orders SET status = 'shipped' WHERE id = 42`;
const oltpPlan = await explain(db, oltpSql);
show('plan', oltpPlan);
assert.match(oltpPlan, /Index Scan using orders_pkey/);
const oltpMs = await timeIt(() => db.query(oltpSql), 20);

heading('OLAP: monthly revenue per country over every order');
const olapSql = `
  SELECT u.country, date_trunc('month', o.created_at) AS month, sum(o.total) AS revenue
  FROM orders o JOIN users u ON u.id = o.user_id
  GROUP BY 1, 2 ORDER BY 2, 1`;
const olapPlan = await explain(db, olapSql);
show('plan', olapPlan);
assert.match(olapPlan, /Seq Scan on orders/);
const report = await all(db, olapSql);
const olapMs = await timeIt(() => db.query(olapSql), 3);
show('report rows', report.length);
show('first rows', report.slice(0, 3));
assert.equal(report.length, 5 * 10); // 5 countries x 10 months

show('\nOLTP avg ms', oltpMs.toFixed(2));
show('OLAP avg ms', olapMs.toFixed(2));
assert.ok(olapMs > oltpMs, 'the full-table report should be slower than a single-row write');
console.log('Row stores (PostgreSQL) are built for the first; column stores (ClickHouse, BigQuery) for the second.');

await db.close();
console.log('\nOK');
