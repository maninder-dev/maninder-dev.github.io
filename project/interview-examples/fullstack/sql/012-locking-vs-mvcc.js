// Topic 12: Locking vs MVCC  (Full-Stack Handbook, Part 1)
// Run: npm run ex 12       (or: node 012-locking-vs-mvcc.js)
// What it shows: real PostgreSQL row versions (xmin/xmax/ctid) - an UPDATE writes a new tuple.
// Then a simulation of two sessions: under MVCC a reader is not blocked by an uncommitted writer
// (it sees the old version), but a second writer on the same row must wait.
import assert from 'node:assert/strict';
import { createDb, one, heading, show } from './lib/db.js';
import { MvccStore, step } from './lib/sim.js';

const db = await createDb();
await db.exec(`CREATE TABLE accounts (id INT PRIMARY KEY, balance INT NOT NULL); INSERT INTO accounts VALUES (1, 100);`);
const version = () => one(db, `SELECT xmin::text::int AS xmin, xmax::text::int AS xmax, ctid::text, balance FROM accounts WHERE id = 1`);

heading('Real PostgreSQL: every UPDATE creates a new row version');
const v1 = await version();
show('before', v1);
await db.query('UPDATE accounts SET balance = 200 WHERE id = 1');
const v2 = await version();
show('after ', v2);
assert.notEqual(v2.xmin, v1.xmin, 'new version was created by a newer transaction');
assert.notEqual(v2.ctid, v1.ctid, 'new version lives at a new physical location');
console.log('The old tuple at', v1.ctid, 'is now dead (xmax set) until VACUUM reclaims it.');

heading('Simulation: MVCC readers do not wait for writers');
const s = new MvccStore({ acct1: 100 });
const A = s.begin('A'), B = s.begin('B');
s.write(A, 'acct1', 150); step('A', 'UPDATE balance = 150 (open transaction)');
const readerSees = s.read(B, 'acct1'); step('B', `SELECT balance -> ${readerSees} (old version, no waiting)`);
assert.equal(readerSees, 100);
console.log('  versions:', JSON.stringify(s.versions('acct1')));
assert.equal(s.versions('acct1').length, 2);

heading('...but writers still lock each other');
let waited = false;
try { s.write(B, 'acct1', 999); } catch (e) { waited = e.code === 'WAIT'; step('B', e.message); }
assert.ok(waited);
s.commit(A); step('A', 'COMMIT');
s.write(B, 'acct1', s.read(B, 'acct1') + 1); s.commit(B); step('B', 'retries: balance = balance + 1 -> 151; COMMIT');
assert.equal(s.read(s.begin('C'), 'acct1'), 151);
console.log('\nWith pure locking (no MVCC), B\'s plain SELECT would also have waited for A.');

await db.close();
console.log('\nOK');
