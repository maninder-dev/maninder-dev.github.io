// Topic 19: Tables vs Views vs Materialized Views  (Full-Stack Handbook, Part 2)
// Run: npm run ex 19       (or: node 019-views-materialized-views.js)
// What it shows: a view re-runs its query (always fresh); a materialized view stores the result
// (fast, stale until REFRESH). REFRESH ... CONCURRENTLY needs a unique index.
import assert from 'node:assert/strict';
import { createDb, one, explain, heading, show, timeIt, expectPgError } from './lib/db.js';
import { seedShop } from './lib/seed.js';

const db = await createDb();
await seedShop(db, { users: 5000, orders: 50000 });

heading('A view stores only the query');
await db.exec(`CREATE VIEW active_users AS SELECT id, email FROM users WHERE is_active`);
const viewPlan = await explain(db, 'SELECT count(*) FROM active_users');
show('plan of SELECT count(*) FROM active_users', viewPlan);
assert.match(viewPlan, /Seq Scan on users/, 'the view expanded into its base query');
const before = (await one(db, 'SELECT count(*)::int AS n FROM active_users')).n;
await db.query(`UPDATE users SET is_active = false WHERE id <= 100 AND is_active`);
const after = (await one(db, 'SELECT count(*)::int AS n FROM active_users')).n;
show('active users before / after deactivating some', `${before} / ${after}`);
assert.ok(after < before, 'views are always current');

heading('A materialized view stores the result');
await db.exec(`
  CREATE MATERIALIZED VIEW daily_sales AS
    SELECT date(created_at) AS day, sum(total) AS revenue, count(*) AS orders FROM orders GROUP BY 1;
  CREATE UNIQUE INDEX ON daily_sales(day);
`);
const q = `SELECT revenue FROM daily_sales WHERE day = '2026-03-01'`;
const raw = `SELECT sum(total) AS revenue FROM orders WHERE date(created_at) = '2026-03-01'`;
show('plan (reads stored rows)', await explain(db, q));
const mvMs = await timeIt(() => db.query(q), 20);
const rawMs = await timeIt(() => db.query(raw), 5);
show('ms: materialized view vs aggregate on base table', `${mvMs.toFixed(2)} vs ${rawMs.toFixed(2)}`);
assert.ok(mvMs < rawMs);

heading('...but it goes stale until refreshed');
const rev = async (sql) => Number((await one(db, sql)).revenue);
const stale = await rev(q);
await db.query(`INSERT INTO orders (user_id, status, total, created_at) VALUES (1, 'paid', 1000, '2026-03-01 12:00')`);
show('after a new 1000 order: view / base', `${await rev(q)} / ${await rev(raw)}`);
assert.equal(await rev(q), stale);
await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales');
show('after REFRESH ... CONCURRENTLY', await rev(q));
assert.equal(await rev(q), stale + 1000);

heading('CONCURRENTLY requires a unique index');
await db.exec(`CREATE MATERIALIZED VIEW status_counts AS SELECT status, count(*) FROM orders GROUP BY status`);
const err = await expectPgError(() => db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY status_counts'), '55000');
show('error', err.message);

await db.close();
console.log('\nOK');
