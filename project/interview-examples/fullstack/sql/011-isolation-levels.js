// Topic 11: Isolation Levels  (Full-Stack Handbook, Part 1)
// Run: npm run ex 11       (or: node 011-isolation-levels.js)
// What it shows (simulation): two interleaved transactions on an MVCC store that follows
// PostgreSQL's visibility rules reproduce dirty, non-repeatable and phantom reads at each level.
// PGlite is a single connection, so the real-SQL part only shows how the level is set and checked.
import assert from 'node:assert/strict';
import { createDb, one, heading, show } from './lib/db.js';
import { MvccStore, step } from './lib/sim.js';

// Each scenario: B changes data while A reads twice. Returns [firstRead, secondRead].
function dirtyRead(level) {
  const s = new MvccStore({ acct1: 100 });
  const A = s.begin('A', level), B = s.begin('B');
  s.write(B, 'acct1', 200); step('B', 'UPDATE balance = 200 (not committed)');
  const seen = s.read(A, 'acct1'); step('A', `SELECT balance -> ${seen}`);
  s.rollback(B); step('B', 'ROLLBACK');
  return seen;
}
function nonRepeatable(level) {
  const s = new MvccStore({ acct1: 100 });
  const A = s.begin('A', level), B = s.begin('B');
  const r1 = s.read(A, 'acct1'); step('A', `SELECT balance -> ${r1}`);
  s.write(B, 'acct1', 200); s.commit(B); step('B', 'UPDATE balance = 200; COMMIT');
  const r2 = s.read(A, 'acct1'); step('A', `SELECT balance -> ${r2}`);
  return [r1, r2];
}
function phantom(level) {
  const s = new MvccStore({ order1: 500, order2: 900 });
  const A = s.begin('A', level), B = s.begin('B');
  const big = (k, v) => v > 400;
  const r1 = s.scan(A, big).length; step('A', `SELECT count(*) WHERE total > 400 -> ${r1}`);
  s.write(B, 'order3', 700); s.commit(B); step('B', 'INSERT order total 700; COMMIT');
  const r2 = s.scan(A, big).length; step('A', `SELECT count(*) WHERE total > 400 -> ${r2}`);
  return [r1, r2];
}

heading('Dirty read');
console.log('READ UNCOMMITTED (textbook; PostgreSQL silently upgrades it to READ COMMITTED):');
assert.equal(dirtyRead('read uncommitted'), 200, 'saw a value that was rolled back');
console.log('READ COMMITTED:');
assert.equal(dirtyRead('read committed'), 100);

heading('Non-repeatable read');
console.log('READ COMMITTED (new snapshot per statement):');
assert.deepEqual(nonRepeatable('read committed'), [100, 200]);
console.log('REPEATABLE READ (one snapshot for the transaction):');
assert.deepEqual(nonRepeatable('repeatable read'), [100, 100]);

heading('Phantom read');
console.log('READ COMMITTED:');
assert.deepEqual(phantom('read committed'), [2, 3]);
console.log('REPEATABLE READ (PostgreSQL snapshot also hides new rows):');
assert.deepEqual(phantom('repeatable read'), [2, 2]);

heading('Real PostgreSQL: setting and checking the level');
const db = await createDb();
show('default', (await one(db, 'SHOW default_transaction_isolation')).default_transaction_isolation);
await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
const lvl = (await one(db, 'SHOW transaction_isolation')).transaction_isolation;
await db.query('COMMIT');
show('inside BEGIN ISOLATION LEVEL REPEATABLE READ', lvl);
assert.equal(lvl, 'repeatable read');
await db.close();
console.log('\nOK');
