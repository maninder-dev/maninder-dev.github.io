// Topic 216: Database Questions  (Full-Stack Handbook, Part 11)
// Run: npm run ex 216      (or: node 216-database-questions.js)
// What it shows: one runnable answer per interview question - Postgres vs document storage, index
// speed-up and cost, leftmost prefix, N+1 detection from a query log, the bank-transfer pattern,
// DELETE vs TRUNCATE vs DROP, WHERE vs HAVING.
import assert from 'node:assert/strict';
import { createDb, all, one, explain, heading, show, timeIt, expectPgError } from './lib/db.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT NOT NULL, name TEXT);
  INSERT INTO users (email, name) SELECT 'u' || g || '@x.com', 'User ' || g FROM generate_series(1, 200000) g;
  CREATE TABLE orders (id SERIAL PRIMARY KEY, user_id INT NOT NULL, status TEXT NOT NULL, total INT NOT NULL, created_at TIMESTAMPTZ NOT NULL);
  INSERT INTO orders (user_id, status, total, created_at)
    SELECT 1 + g % 500, (ARRAY['paid','pending','paid','refunded'])[1 + g % 4], 100 + (g * 37) % 900, now() - g * interval '1 hour'
    FROM generate_series(1, 50000) g;
  ANALYZE;
`);

heading('Q. PostgreSQL over MongoDB? Multi-row, all-or-nothing money movement');
await db.exec(`CREATE TABLE accounts (id INT PRIMARY KEY, balance INT NOT NULL CHECK (balance >= 0));
               INSERT INTO accounts VALUES (1, 1000), (2, 0);`);
await expectPgError(() => db.transaction(async (tx) => {
  await tx.query('UPDATE accounts SET balance = balance + 5000 WHERE id = 2');
  await tx.query('UPDATE accounts SET balance = balance - 5000 WHERE id = 1');
}), '23514');
show('after a failed 5000 transfer', await all(db, 'SELECT * FROM accounts ORDER BY id'));
assert.equal((await one(db, 'SELECT balance FROM accounts WHERE id = 2')).balance, 0);

heading('Q. How does an index speed up a query, and what does it cost?');
const q = `SELECT * FROM users WHERE email = 'u123456@x.com'`;
const seq = await timeIt(() => db.query(q), 5);
show('plan without index', (await explain(db, q)).split('\n')[0]);
await db.exec('CREATE INDEX idx_users_email ON users(email)');
const idx = await timeIt(() => db.query(q), 5);
show('plan with index', (await explain(db, q)).split('\n')[0]);
show('ms', `${seq.toFixed(2)} -> ${idx.toFixed(2)}`);
show('cost: index size', (await one(db, `SELECT pg_size_pretty(pg_relation_size('idx_users_email')) AS s`)).s);
assert.ok(idx < seq);

heading('Q. Leftmost prefix rule');
await db.exec('CREATE INDEX idx_orders ON orders (user_id, status, created_at); ANALYZE orders;');
for (const where of ['user_id = 7', `user_id = 7 AND status = 'paid'`, `status = 'paid'`]) {
  const p = await explain(db, `SELECT * FROM orders WHERE ${where}`);
  const cond = p.match(/Index Cond: (.*)/)?.[1] ?? '(none)';
  console.log(`    ${where.padEnd(32)} Index Cond: ${cond}`);
  if (where.startsWith('user_id')) assert.match(cond, /user_id/);
}
const sorted = await explain(db, 'SELECT * FROM orders WHERE user_id = 7 ORDER BY status, created_at LIMIT 5');
show('ORDER BY status, created_at LIMIT 5 needs no Sort', !/Sort/.test(sorted));
assert.doesNotMatch(sorted, /Sort/);

heading('Q. N+1: detect it in the query log');
const log = [];
const logged = (sql, p) => { log.push(sql); return db.query(sql, p); };
const posts = (await logged('SELECT id, user_id FROM orders ORDER BY id LIMIT 50')).rows;
for (const p of posts) await logged('SELECT * FROM users WHERE id = $1', [p.user_id]);
const repeated = Object.entries(Object.groupBy(log, (s) => s)).filter(([, v]) => v.length > 1);
show('same statement repeated', repeated.map(([s, v]) => `${v.length}x ${s}`));
assert.equal(repeated[0][1].length, 50);
const fix = await all(db, 'SELECT * FROM users WHERE id = ANY($1)', [[...new Set(posts.map((p) => p.user_id))]]);
show('fix: one WHERE id = ANY($1) query returns', `${fix.length} users`);

heading('Q. Bank transfer: lock both rows in order, guard the balance');
await db.exec('UPDATE accounts SET balance = 1000 WHERE id = 1');
await db.transaction(async (tx) => {
  await tx.query('SELECT id, balance FROM accounts WHERE id IN (1, 2) ORDER BY id FOR UPDATE');
  const r = await tx.query('UPDATE accounts SET balance = balance - 500 WHERE id = 1 AND balance >= 500');
  if (r.affectedRows !== 1) throw new Error('insufficient funds');
  await tx.query('UPDATE accounts SET balance = balance + 500 WHERE id = 2');
});
show('balances', (await all(db, 'SELECT balance FROM accounts ORDER BY id')).map((r) => r.balance));

heading('Q. DELETE vs TRUNCATE vs DROP');
await db.exec(`CREATE TABLE staging (id SERIAL PRIMARY KEY, v INT); INSERT INTO staging (v) SELECT g FROM generate_series(1, 1000) g;`);
await db.query('BEGIN'); await db.query('DELETE FROM staging WHERE v <= 10'); await db.query('ROLLBACK');
show('DELETE rolled back, rows', (await one(db, 'SELECT count(*)::int AS n FROM staging')).n);
await db.query('TRUNCATE TABLE staging RESTART IDENTITY');
await db.query('INSERT INTO staging (v) VALUES (1)');
show('after TRUNCATE ... RESTART IDENTITY, next id', (await one(db, 'SELECT id FROM staging')).id);
assert.equal((await one(db, 'SELECT id FROM staging')).id, 1);
await db.query('DROP TABLE staging');
show('after DROP', (await one(db, `SELECT to_regclass('staging') AS t`)).t ?? 'table gone');

heading('Q. WHERE vs HAVING');
const big = await all(db, `SELECT user_id, SUM(total)::int AS spent FROM orders
  WHERE status = 'paid' GROUP BY user_id HAVING SUM(total) > 30000 ORDER BY spent DESC LIMIT 3`);
show('top paid spenders over 30,000', big);
assert.ok(big.every((r) => r.spent > 30000));

await db.close();
console.log('\nOK');
