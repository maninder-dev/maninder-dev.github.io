// Topic 25: Index Scan vs Sequential Scan  (Full-Stack Handbook, Part 2)
// Run: npm run ex 25       (or: node 025-index-scan-vs-seq-scan.js)
// What it shows: the four access paths on 100,000 users - Seq Scan when 90% of rows match, Index
// Scan for one row, Index Only Scan when the index covers the query, Bitmap Heap Scan for a few
// thousand rows. And forcing the index for the 90% query is slower.
import assert from 'node:assert/strict';
import { createDb, explain, heading, show } from './lib/db.js';
import { seedUsers } from './lib/seed.js';

const db = await createDb();
await seedUsers(db, 100000);
await db.exec(`CREATE INDEX idx_users_active ON users(is_active); CREATE INDEX idx_users_created ON users(created_at);`);
await db.query('VACUUM ANALYZE users');

const cases = [
  ['90% of rows match', 'SELECT * FROM users WHERE is_active = true', 'Seq Scan'],
  ['one row by primary key', 'SELECT * FROM users WHERE id = 42', 'Index Scan using users_pkey'],
  ['covered by the index', `SELECT email FROM users WHERE email = 'user42@example.com'`, 'Index Only Scan'],
  ['a few thousand rows', `SELECT * FROM users WHERE created_at BETWEEN '2025-03-01' AND '2025-03-10'`, 'Bitmap Heap Scan'],
];
for (const [label, sql, expected] of cases) {
  heading(label);
  const plan = await explain(db, sql);
  show('plan', plan);
  assert.ok(plan.includes(expected), `expected ${expected}`);
}

heading('Why the planner avoided the index for is_active = true');
const sql = 'SELECT * FROM users WHERE is_active = true';
// Server-side execution time (EXPLAIN ANALYZE), so shipping 90k rows to JS doesn't skew it
const execMs = async () => +(await explain(db, sql, 'ANALYZE')).match(/Execution Time: ([\d.]+)/)[1];
const seqMs = await execMs();
await db.query('SET enable_seqscan = off');
await db.query('SET enable_bitmapscan = off');
const forced = await explain(db, sql);
show('forced plan', forced);
assert.match(forced, /Index Scan/);
const idxMs = await execMs();
await db.query('RESET ALL');
show('ms seq scan vs forced index scan', `${seqMs.toFixed(1)} vs ${idxMs.toFixed(1)}`);
console.log('Thousands of random index lookups cost more than one sequential read of the table.');

await db.close();
console.log('\nOK');
