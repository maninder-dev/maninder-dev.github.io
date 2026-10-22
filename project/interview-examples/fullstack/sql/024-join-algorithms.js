// Topic 24: How Joins Work Internally  (Full-Stack Handbook, Part 2)
// Run: npm run ex 24       (or: node 024-join-algorithms.js)
// What it shows: the planner picking Nested Loop (tiny outer side + index), Hash Join (big unsorted
// inputs) and Merge Join (both sides already sorted). Then forcing the other algorithms with
// enable_* settings to compare timings on the same query.
import assert from 'node:assert/strict';
import { createDb, explain, heading, show, timeIt } from './lib/db.js';
import { seedShop } from './lib/seed.js';

const db = await createDb();
await seedShop(db, { users: 5000, orders: 50000 });
await db.exec('CREATE INDEX idx_orders_user ON orders(user_id); ANALYZE orders;');

heading('Nested Loop: a handful of users, index lookup into orders for each');
const nl = await explain(db, `SELECT u.name, o.total FROM users u JOIN orders o ON o.user_id = u.id WHERE u.id IN (1, 2, 3)`);
show('plan', nl);
assert.match(nl, /Nested Loop/);

heading('Hash Join: all orders for 20% of users');
const hjSql = `SELECT u.name, o.total FROM users u JOIN orders o ON o.user_id = u.id WHERE u.country = 'IN'`;
const hj = await explain(db, hjSql);
show('plan', hj);
assert.match(hj, /Hash Join/);

heading('Merge Join: both inputs come pre-sorted on the join key');
await db.exec(`CREATE TABLE a (id INT PRIMARY KEY, v INT); CREATE TABLE b (id INT PRIMARY KEY, w INT);
               INSERT INTO a SELECT g, g FROM generate_series(1, 100000) g;
               INSERT INTO b SELECT g, g FROM generate_series(1, 100000) g;`);
await db.query('VACUUM ANALYZE a');
await db.query('VACUUM ANALYZE b');
const mj = await explain(db, `SELECT a.id, b.w FROM a JOIN b ON a.id = b.id ORDER BY a.id`);
show('plan', mj);
assert.match(mj, /Merge Join/);

heading('Same Hash Join query, other algorithms forced');
const timings = {};
for (const [name, off] of [['Hash Join', []], ['Merge Join', ['enable_hashjoin', 'enable_nestloop']], ['Nested Loop', ['enable_hashjoin', 'enable_mergejoin']]]) {
  for (const s of off) await db.query(`SET ${s} = off`);
  const plan = await explain(db, hjSql);
  assert.ok(plan.includes(name), `${name} should be used`);
  timings[name] = (await timeIt(() => db.query(hjSql), 3)).toFixed(1) + ' ms';
  await db.query('RESET ALL');
}
show('timings', timings);

await db.close();
console.log('\nOK');
