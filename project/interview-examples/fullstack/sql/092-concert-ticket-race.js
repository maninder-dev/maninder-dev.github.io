// Topic 92: Race Conditions: The Concert Ticket Problem  (Full-Stack Handbook, Part 5)
// Run: npm run ex 92       (or: node 092-concert-ticket-race.js)
// What it shows (simulation of two users on one PGlite connection, steps interleaved by hand): the
// buggy read-then-write sells the last ticket twice; the atomic conditional UPDATE sells it once
// (rowCount tells the loser); a UNIQUE constraint is a last line of defence.
import assert from 'node:assert/strict';
import { createDb, one, heading, expectPgError } from './lib/db.js';
import { step } from './lib/sim.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE tickets (id INT PRIMARY KEY, status TEXT NOT NULL, user_id INT);
  CREATE TABLE sales (ticket_id INT NOT NULL, user_id INT NOT NULL);
  INSERT INTO tickets VALUES (1, 'available', NULL);
`);
const reset = () => db.exec(`UPDATE tickets SET status = 'available', user_id = NULL; DELETE FROM sales;`);
const sales = async () => (await one(db, 'SELECT count(*)::int AS n FROM sales')).n;

heading('BUGGY: read, then write (the gap is the bug)');
const findAvailable = () => one(db, `SELECT * FROM tickets WHERE id = 1 AND status = 'available'`);
const tA = await findAvailable(); step('A', `findOne -> ${tA ? 'available' : 'none'}`);
const tB = await findAvailable(); step('B', `findOne -> ${tB ? 'available' : 'none'}`);
for (const [who, t, uid] of [['A', tA, 41], ['B', tB, 42]]) {
  if (t) {
    await db.query(`UPDATE tickets SET status = 'sold', user_id = $1 WHERE id = 1`, [uid]);
    await db.query('INSERT INTO sales VALUES (1, $1)', [uid]);
    step(who, `update -> sold to user ${uid}`);
  }
}
console.log(`  tickets sold: ${await sales()} (there was 1)`);
assert.equal(await sales(), 2, 'double booking');

heading('FIX: atomic conditional UPDATE - the database checks and writes in one step');
await reset();
async function buy(who, userId) {
  const r = await db.query(`UPDATE tickets SET status = 'sold', user_id = $1 WHERE id = 1 AND status = 'available'`, [userId]);
  if (r.affectedRows === 1) await db.query('INSERT INTO sales VALUES (1, $1)', [userId]);
  step(who, `UPDATE ... AND status = 'available' -> ${r.affectedRows} row(s): ${r.affectedRows ? 'you got it' : 'sold out'}`);
  return r.affectedRows;
}
const a = await buy('A', 41), b = await buy('B', 42);
assert.deepEqual([a, b], [1, 0]);
assert.equal(await sales(), 1);
console.log('  Under real concurrency B blocks on A\'s row lock, re-checks status after A commits, matches 0 rows.');

heading('Safety net: a UNIQUE constraint makes a double sale impossible at the storage level');
await reset();
await db.query('ALTER TABLE sales ADD CONSTRAINT one_sale_per_ticket UNIQUE (ticket_id)');
await db.query('INSERT INTO sales VALUES (1, 41)'); step('A', 'INSERT sale -> ok');
const err = await expectPgError(() => db.query('INSERT INTO sales VALUES (1, 42)'), '23505');
step('B', `INSERT sale -> ${err.code} unique_violation`);
assert.equal(await sales(), 1);
console.log('\nOther fixes: optimistic locking (093) and pessimistic locking (094).');

await db.close();
console.log('\nOK');
