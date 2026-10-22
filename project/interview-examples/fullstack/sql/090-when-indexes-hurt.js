// Topic 90: When Indexes Hurt  (Full-Stack Handbook, Part 5)
// Run: npm run ex 90       (or: node 090-when-indexes-hurt.js)
// What it shows: the write penalty (insert time with 0 vs 5 indexes), the storage cost (indexes
// bigger than the table), a low-selectivity boolean index the planner ignores, and how to list
// unused indexes from pg_stat_user_indexes.
import assert from 'node:assert/strict';
import { createDb, all, one, explain, heading, show, timeIt } from './lib/db.js';

const db = await createDb();
const cols = 'id INT, email TEXT, name TEXT, city TEXT, is_active BOOLEAN, created_at TIMESTAMPTZ';
await db.exec(`CREATE TABLE lean (${cols}); CREATE TABLE heavy (${cols});
  CREATE INDEX ON heavy(id); CREATE INDEX ON heavy(email); CREATE INDEX ON heavy(name);
  CREATE INDEX ON heavy(city); CREATE INDEX ON heavy(created_at);`);
const load = (t) => db.query(`INSERT INTO ${t} SELECT g, md5(g::text) || '@x.com', md5((g * 7)::text), 'City' || g % 300, g % 2 = 0,
                                now() - g * interval '1 minute' FROM generate_series(1, 100000) g`);

heading('Write penalty');
const leanMs = await timeIt(() => load('lean'));
const heavyMs = await timeIt(() => load('heavy'));
show('insert 100k rows: 0 indexes vs 5 indexes (ms)', `${leanMs.toFixed(0)} vs ${heavyMs.toFixed(0)}`);
assert.ok(heavyMs > leanMs * 1.5);

heading('Storage');
const sz = await one(db, `SELECT pg_size_pretty(pg_relation_size('heavy')) AS table_size,
                                 pg_size_pretty(pg_indexes_size('heavy')) AS indexes_size,
                                 pg_indexes_size('heavy') > pg_relation_size('heavy') AS indexes_bigger`);
show('heavy', sz);
assert.equal(sz.indexes_bigger, true);

heading('Low selectivity: an index on a 50/50 boolean is not used');
await db.exec('CREATE INDEX idx_active ON heavy(is_active); ANALYZE heavy;');
const plan = await explain(db, 'SELECT * FROM heavy WHERE is_active = true');
show('plan', plan);
assert.doesNotMatch(plan, /idx_active/);

heading('Unused indexes: pure cost');
await db.query(`SELECT * FROM heavy WHERE email = 'x'`); // uses the email index once
const unused = await all(db, `SELECT indexrelname, idx_scan FROM pg_stat_user_indexes
                              WHERE relname = 'heavy' ORDER BY idx_scan DESC, indexrelname`);
unused.forEach((r) => console.log('   ', r));
console.log('  On a real server: SELECT relname, indexrelname FROM pg_stat_user_indexes WHERE idx_scan = 0;');
console.log('  (check every replica and a full business cycle before dropping anything)');
assert.equal(unused.length, 6);

await db.close();
console.log('\nOK');
