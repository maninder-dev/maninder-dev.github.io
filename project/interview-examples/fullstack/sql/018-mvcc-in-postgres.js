// Topic 18: MVCC in PostgreSQL - How It Works  (Full-Stack Handbook, Part 2)
// Run: npm run ex 18       (or: node 018-mvcc-in-postgres.js)
// What it shows: the hidden xmin / xmax / ctid columns on real rows. An UPDATE writes a new tuple
// with a new xmin; a rolled-back UPDATE leaves xmax set on the still-visible row; repeated updates
// pile up dead tuples that only VACUUM can reclaim.
import assert from 'node:assert/strict';
import { createDb, one, heading, show } from './lib/db.js';

const db = await createDb();
await db.exec(`CREATE TABLE accounts (id INT PRIMARY KEY, balance INT NOT NULL) WITH (autovacuum_enabled = off);
               INSERT INTO accounts VALUES (1, 100);`);
const row = () => one(db, `SELECT xmin::text, xmax::text, ctid::text, id, balance FROM accounts WHERE id = 1`);

heading('Freshly inserted row');
const r1 = await row();
show('row', r1);
assert.equal(r1.xmax, '0');

heading('UPDATE in transaction T: new tuple, xmin = T');
await db.query('BEGIN');
const xid = (await one(db, 'SELECT txid_current()::text AS x')).x;
await db.query('UPDATE accounts SET balance = 150 WHERE id = 1');
await db.query('COMMIT');
const r2 = await row();
show(`row (T = ${xid})`, r2);
assert.equal(r2.xmin, xid);
assert.notEqual(r2.ctid, r1.ctid);

heading('A rolled-back UPDATE: xmax points at the aborted transaction, row still visible');
await db.query('BEGIN');
const aborted = (await one(db, 'SELECT txid_current()::text AS x')).x;
await db.query('UPDATE accounts SET balance = 999 WHERE id = 1');
await db.query('ROLLBACK');
const r3 = await row();
show(`row (aborted T = ${aborted})`, r3);
assert.equal(r3.xmax, aborted, 'deleter recorded, but it never committed, so the version is live');
assert.equal(r3.balance, 150);

heading('Dead tuples: 1 live row, but every update left a copy behind');
await db.exec(`INSERT INTO accounts SELECT g, 0 FROM generate_series(2, 2000) g`);
const size = async () => (await one(db, `SELECT pg_relation_size('accounts')::int AS b`)).b;
const s0 = await size();
for (let i = 0; i < 5; i++) await db.query('UPDATE accounts SET balance = balance + 1');
const s1 = await size();
show('table bytes before / after 5 full-table updates', `${s0} / ${s1}`);
assert.ok(s1 > s0 * 3, 'each update wrote new versions instead of overwriting');
await db.query('VACUUM FULL accounts');
const s2 = await size();
show('after VACUUM FULL', s2);
assert.ok(s2 < s1);
console.log('See 031-032-vacuum-autovacuum.js for plain VACUUM vs VACUUM FULL.');

await db.close();
console.log('\nOK');
