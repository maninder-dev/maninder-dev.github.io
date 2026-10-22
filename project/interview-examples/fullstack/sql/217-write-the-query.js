// Topic 217: SQL Query Questions (Write the Query)  (Full-Stack Handbook, Part 11)
// Run: npm run ex 217      (or: node 217-write-the-query.js)
// What it shows: every "write the query" answer from the handbook run against small, hand-checkable
// data, with the expected answer asserted: second-highest salary (DENSE_RANK vs ROW_NUMBER),
// duplicates + dedupe, top 3 per category, users with no orders, running total, INNER/LEFT/FULL.
import assert from 'node:assert/strict';
import { createDb, all, heading, show } from './lib/db.js';

const db = await createDb();

heading('Second-highest salary (ties!)');
await db.exec(`CREATE TABLE employees (id SERIAL PRIMARY KEY, salary INT);
               INSERT INTO employees (salary) VALUES (90000), (90000), (80000), (70000);`);
const dense = await all(db, `SELECT salary FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk FROM employees) t WHERE rnk = 2 LIMIT 1`);
const rowNum = await all(db, `SELECT salary FROM (
  SELECT salary, ROW_NUMBER() OVER (ORDER BY salary DESC) AS rn FROM employees) t WHERE rn = 2`);
show('DENSE_RANK', dense[0].salary);
show('ROW_NUMBER (wrong)', rowNum[0].salary);
assert.equal(dense[0].salary, 80000);
assert.equal(rowNum[0].salary, 90000);

heading('Duplicate emails, then delete duplicates keeping the oldest');
await db.exec(`CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT, name TEXT);
  INSERT INTO users (email, name) VALUES ('ann@x.com','Ann'), ('bob@x.com','Bob'), ('ann@x.com','Ann 2'),
    ('cat@x.com','Cat'), ('ann@x.com','Ann 3'), ('bob@x.com','Bob 2'), ('dan@x.com','Dan');`);
const dups = await all(db, 'SELECT email, COUNT(*)::int AS n FROM users GROUP BY email HAVING COUNT(*) > 1 ORDER BY email');
show('duplicates', dups);
assert.deepEqual(dups, [{ email: 'ann@x.com', n: 3 }, { email: 'bob@x.com', n: 2 }]);
const del = await db.query('DELETE FROM users u USING users keep WHERE u.email = keep.email AND u.id > keep.id');
const left = await all(db, 'SELECT id, name FROM users ORDER BY id');
show(`deleted ${del.affectedRows}, kept`, left.map((r) => r.name));
assert.deepEqual(left.map((r) => r.name), ['Ann', 'Bob', 'Cat', 'Dan']);

heading('Top 3 products by revenue in each category');
await db.exec(`CREATE TABLE products (id INT PRIMARY KEY, category TEXT, name TEXT);
  CREATE TABLE order_items (product_id INT, qty INT, price INT);
  INSERT INTO products VALUES (1,'laptop','Air'),(2,'laptop','Pro'),(3,'laptop','X1'),(4,'laptop','Zen'),
                              (5,'phone','P1'),(6,'phone','P2');
  INSERT INTO order_items VALUES (1,1,1000),(1,1,1000),(2,1,2500),(3,3,900),(4,1,500),(5,2,700),(6,1,300);`);
const top3 = await all(db, `SELECT category, name, revenue::int FROM (
  SELECT p.category, p.name, SUM(oi.qty * oi.price) AS revenue,
         ROW_NUMBER() OVER (PARTITION BY p.category ORDER BY SUM(oi.qty * oi.price) DESC) AS rn
  FROM order_items oi JOIN products p ON p.id = oi.product_id
  GROUP BY p.category, p.name) ranked WHERE rn <= 3 ORDER BY category, revenue DESC`);
top3.forEach((r) => console.log('   ', r));
assert.deepEqual(top3.filter((r) => r.category === 'laptop').map((r) => r.name), ['X1', 'Pro', 'Air']);

heading('Users who signed up but never ordered');
await db.exec(`CREATE TABLE orders (id INT PRIMARY KEY, user_id INT, total INT, created_at DATE);
  INSERT INTO orders VALUES (10, 1, 100, '2026-10-01'), (11, 1, 50, '2026-10-01'), (12, 4, 70, '2026-10-02'),
                            (13, 9, 40, '2026-10-03'), (14, 2, 30, '2026-10-03');`);
const notExists = await all(db, `SELECT u.id, u.email FROM users u
  WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id) ORDER BY u.id`);
const leftJoin = await all(db, `SELECT u.id, u.email FROM users u
  LEFT JOIN orders o ON o.user_id = u.id WHERE o.id IS NULL ORDER BY u.id`);
show('NOT EXISTS', notExists);
assert.deepEqual(notExists, leftJoin);
assert.deepEqual(notExists.map((r) => r.email), ['dan@x.com'], 'Cat (id 4) has order 12, Dan has none');

heading('Running total of daily revenue');
const running = await all(db, `SELECT day::text, revenue::int, (SUM(revenue) OVER (ORDER BY day))::int AS running_total
  FROM (SELECT created_at AS day, SUM(total) AS revenue FROM orders GROUP BY 1) d ORDER BY day`);
running.forEach((r) => console.log('   ', r));
assert.deepEqual(running.map((r) => r.running_total), [150, 220, 290]);

heading('INNER vs LEFT vs FULL JOIN');
await db.exec(`CREATE TABLE u2 (id INT, name TEXT); CREATE TABLE o2 (id INT, user_id INT);
  INSERT INTO u2 VALUES (1, 'Ann'), (2, 'Bob'); INSERT INTO o2 VALUES (10, 1), (11, 9);`);
const join = async (kind) => (await all(db, `SELECT u.name, o.id FROM u2 u ${kind} JOIN o2 o ON o.user_id = u.id ORDER BY o.id NULLS LAST, u.name`))
  .map((r) => `${r.name ?? 'NULL'}|${r.id ?? 'NULL'}`);
const results = { INNER: await join('INNER'), LEFT: await join('LEFT'), FULL: await join('FULL') };
for (const [k, v] of Object.entries(results)) console.log(`    ${k.padEnd(6)} ${v.join('  ')}`);
assert.deepEqual(results.INNER, ['Ann|10']);
assert.deepEqual(results.LEFT, ['Ann|10', 'Bob|NULL']);
assert.deepEqual(results.FULL, ['Ann|10', 'NULL|11', 'Bob|NULL']);

await db.close();
console.log('\nOK');
