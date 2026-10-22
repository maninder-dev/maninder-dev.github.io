// Topic 8: Index - What and Why?  (Full-Stack Handbook, Part 1)
// Run: npm run ex 8        (or: node 008-index-basics.js)
// What it shows: looking up one email in 100,000 users is a Seq Scan reading every page; after
// CREATE INDEX it is an Index Scan reading a handful of pages. Also the write-side cost.
import assert from 'node:assert/strict';
import { createDb, one, explain, heading, show, timeIt } from './lib/db.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL);
  INSERT INTO users (email, name) SELECT 'user' || g || '@example.com', 'User ' || g FROM generate_series(1, 100000) g;
  ANALYZE users;
`);
const sql = `SELECT * FROM users WHERE email = 'user77777@example.com'`;
const pages = (await one(db, `SELECT relpages FROM pg_class WHERE relname = 'users'`)).relpages;
show('table size', `${pages} pages of 8 KB`);

heading('Without an index');
const before = await explain(db, sql, 'ANALYZE, BUFFERS, TIMING OFF');
show('plan', before);
assert.match(before, /Seq Scan on users/);
const slowMs = await timeIt(() => db.query(sql), 10);

heading('CREATE INDEX idx_users_email ON users(email)');
await db.exec('CREATE INDEX idx_users_email ON users(email); ANALYZE users;');
const after = await explain(db, sql, 'ANALYZE, BUFFERS, TIMING OFF');
show('plan', after);
assert.match(after, /Index Scan using idx_users_email/);
const fastMs = await timeIt(() => db.query(sql), 10);
const buffers = (plan) => [...plan.match(/Buffers: .*/)[0].matchAll(/(?:hit|read)=(\d+)/g)].reduce((s, m) => s + +m[1], 0);
show('pages touched (seq -> index)', `${buffers(before)} -> ${buffers(after)}`);
assert.ok(buffers(after) < 10 && buffers(before) > 500);

show('avg lookup ms (seq -> index)', `${slowMs.toFixed(2)} -> ${fastMs.toFixed(2)}`);
assert.ok(fastMs < slowMs);

heading('The trade-off: every write also maintains the index');
const idxSize = (await one(db, `SELECT pg_size_pretty(pg_relation_size('idx_users_email')) AS s`)).s;
show('index size on disk', idxSize);
await db.exec('CREATE TABLE plain (email TEXT); CREATE TABLE indexed (email TEXT); CREATE INDEX ON indexed(email);');
const ins = (t) => db.query(`INSERT INTO ${t} SELECT md5(g::text) FROM generate_series(1, 50000) g`);
const plainMs = await timeIt(() => ins('plain'));
const indexedMs = await timeIt(() => ins('indexed'));
show('insert 50k rows ms (no index -> 1 index)', `${plainMs.toFixed(0)} -> ${indexedMs.toFixed(0)}`);

await db.close();
console.log('\nOK');
