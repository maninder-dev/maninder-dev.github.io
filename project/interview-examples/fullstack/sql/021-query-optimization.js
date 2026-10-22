// Topic 21: Query Optimization Basics  (Full-Stack Handbook, Part 2)
// Run: npm run ex 21       (or: node 021-query-optimization.js)
// What it shows: three of the handbook's rules measured on 200,000 posts - OFFSET vs keyset
// pagination, a function on an indexed column vs a plain range, and SELECT * vs only needed columns.
import assert from 'node:assert/strict';
import { createDb, all, explain, heading, show, timeIt } from './lib/db.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE posts (id SERIAL PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL);
  INSERT INTO posts (title, body, created_at)
    SELECT 'Post ' || g, repeat('lorem ipsum ', 20), timestamptz '2024-01-01' + g * interval '5 minutes'
    FROM generate_series(1, 200000) g;
  CREATE INDEX idx_posts_created ON posts(created_at);
`);
await db.query('VACUUM ANALYZE posts'); // VACUUM can't run inside exec()'s implicit transaction

heading('Pagination: OFFSET reads and throws away rows; keyset seeks straight there');
const offsetSql = 'SELECT id, title FROM posts ORDER BY id LIMIT 20 OFFSET 150000';
const keysetSql = 'SELECT id, title FROM posts WHERE id > 150000 ORDER BY id LIMIT 20';
const a = await all(db, offsetSql), b = await all(db, keysetSql);
assert.deepEqual(a, b, 'same page either way');
const offsetPlan = await explain(db, offsetSql, 'ANALYZE, TIMING OFF, COSTS OFF');
show('OFFSET plan', offsetPlan);
assert.match(offsetPlan, /rows=150020/, 'had to walk 150,020 rows to return 20');
show('keyset plan', await explain(db, keysetSql, 'ANALYZE, TIMING OFF, COSTS OFF'));
const tOff = await timeIt(() => db.query(offsetSql), 5), tKey = await timeIt(() => db.query(keysetSql), 5);
show('ms OFFSET vs keyset', `${tOff.toFixed(2)} vs ${tKey.toFixed(2)}`);
assert.ok(tKey < tOff);

heading('Don\'t wrap the indexed column in a function');
const fnSql = `SELECT count(*) FROM posts WHERE extract(year FROM created_at AT TIME ZONE 'UTC') = 2025`;
const rangeSql = `SELECT count(*) FROM posts WHERE created_at >= '2025-01-01 00:00+00' AND created_at < '2026-01-01 00:00+00'`;
assert.deepEqual(await all(db, fnSql), await all(db, rangeSql));
const fnPlan = await explain(db, fnSql), rangePlan = await explain(db, rangeSql);
show('function plan', fnPlan);
show('range plan', rangePlan);
assert.doesNotMatch(fnPlan, /Index Cond/, 'the function result is only a Filter applied to every row');
assert.match(rangePlan, /Index Cond/, 'the range seeks into the index');

heading('Select only the columns you need');
const star = `SELECT * FROM posts WHERE created_at >= '2025-06-01' AND created_at < '2025-06-02'`;
const narrow = `SELECT created_at FROM posts WHERE created_at >= '2025-06-01' AND created_at < '2025-06-02'`;
const narrowPlan = await explain(db, narrow);
show('SELECT * plan', await explain(db, star));
show('SELECT created_at plan', narrowPlan);
assert.match(narrowPlan, /Index Only Scan/, 'answered from the index alone, heap never touched');

heading('Batch writes: one multi-row INSERT beats many single ones');
await db.exec('CREATE TABLE tags (name TEXT)');
const single = await timeIt(async () => { for (let i = 0; i < 500; i++) await db.query('INSERT INTO tags VALUES ($1)', ['t' + i]); });
const batch = await timeIt(() => db.query(`INSERT INTO tags SELECT 't' || g FROM generate_series(1, 500) g`));
show('ms 500 single inserts vs 1 batch', `${single.toFixed(1)} vs ${batch.toFixed(1)}`);
assert.ok(batch < single);

await db.close();
console.log('\nOK');
