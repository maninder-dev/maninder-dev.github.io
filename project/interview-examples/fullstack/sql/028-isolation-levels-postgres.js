// Topic 28: Isolation Levels in PostgreSQL  (Full-Stack Handbook, Part 2)
// Run: npm run ex 28       (or: node 028-isolation-levels-postgres.js)
// What it shows (simulation for the concurrent part): under REPEATABLE READ a transaction that
// updates a row someone else changed after its snapshot gets SQLSTATE 40001; the handbook's
// withRetry() reruns it on a fresh snapshot. Real SQL: READ UNCOMMITTED is accepted but behaves as
// READ COMMITTED, and REPEATABLE READ keeps one snapshot for the whole transaction.
import assert from 'node:assert/strict';
import { createDb, one, heading, show } from './lib/db.js';
import { MvccStore, step } from './lib/sim.js';

// From the handbook
async function withRetry(fn, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try { return await fn(i); } catch (e) { if (e.code !== '40001' || i === tries - 1) throw e; console.log(`  retry #${i + 1} after ${e.code}: ${e.message}`); }
  }
}

heading('Simulation: concurrent update under REPEATABLE READ -> 40001, then retry');
const s = new MvccStore({ stock: 10 });
let interfered = false;
const result = await withRetry(async (attempt) => {
  const A = s.begin('A', 'repeatable read');
  const qty = s.read(A, 'stock'); step('A', `attempt ${attempt + 1}: SELECT qty -> ${qty}`);
  if (!interfered) {
    interfered = true;
    const B = s.begin('B'); s.write(B, 'stock', s.read(B, 'stock') - 3); s.commit(B);
    step('B', 'UPDATE qty = qty - 3; COMMIT');
  }
  try {
    s.write(A, 'stock', qty - 1); s.commit(A); step('A', `UPDATE qty = ${qty - 1}; COMMIT`);
  } catch (e) { s.rollback(A); step('A', `ERROR ${e.code}`); throw e; }
  return qty - 1;
});
show('final stock', s.read(s.begin('check'), 'stock'));
assert.equal(result, 6, 'both decrements counted: 10 - 3 - 1');

heading('Same race under READ COMMITTED without retry = lost update');
const rc = new MvccStore({ stock: 10 });
const A = rc.begin('A'); const qty = rc.read(A, 'stock');
const B = rc.begin('B'); rc.write(B, 'stock', rc.read(B, 'stock') - 3); rc.commit(B);
rc.write(A, 'stock', qty - 1); rc.commit(A);
show('final stock', rc.read(rc.begin('check'), 'stock'));
assert.equal(rc.read(rc.begin('check'), 'stock'), 9, 'B\'s decrement was overwritten');

heading('Real PostgreSQL');
const db = await createDb();
await db.exec('CREATE TABLE stock (sku TEXT PRIMARY KEY, qty INT); INSERT INTO stock VALUES (\'A1\', 10);');
await db.query('BEGIN ISOLATION LEVEL READ UNCOMMITTED');
show('asked for READ UNCOMMITTED, SHOW transaction_isolation', (await one(db, 'SHOW transaction_isolation')).transaction_isolation);
await db.query('COMMIT');
console.log('  (PostgreSQL never shows dirty data; READ UNCOMMITTED runs as READ COMMITTED)');
await db.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
const lvl = (await one(db, 'SHOW transaction_isolation')).transaction_isolation;
await db.query('UPDATE stock SET qty = qty - 1 WHERE sku = \'A1\'');
await db.query('COMMIT');
show('SERIALIZABLE transaction ran with', lvl);
assert.equal(lvl, 'serializable');
assert.equal((await one(db, 'SELECT qty FROM stock')).qty, 9);
await db.close();
console.log('\nOK');
