// Topic 94: Pessimistic Locking  (Full-Stack Handbook, Part 5)
// Run: npm run ex 94       (or: node 094-pessimistic-locking.js)
// What it shows: the handbook's transaction with SELECT ... FOR UPDATE, run for real (the row lock
// is visible as xmax = our transaction id). The "second buyer waits" part is a simulation with the
// lock manager, because PGlite has one connection. Also NOWAIT for fail-fast.
import assert from 'node:assert/strict';
import { createDb, one, heading, show } from './lib/db.js';
import { LockManager, step } from './lib/sim.js';

const db = await createDb();
await db.exec(`CREATE TABLE tickets (id INT PRIMARY KEY, status TEXT NOT NULL, user_id INT);
               INSERT INTO tickets VALUES (1, 'available', NULL);`);

async function buy(userId) {
  return db.transaction(async (tx) => {
    const ticket = (await tx.query('SELECT * FROM tickets WHERE id = 1 FOR UPDATE')).rows[0];
    const me = (await tx.query('SELECT txid_current()::text AS x')).rows[0].x;
    const locked = (await tx.query('SELECT xmax::text FROM tickets WHERE id = 1')).rows[0].xmax;
    show(`  user ${userId}: row locked by my transaction`, locked === me);
    if (ticket.status !== 'available') throw new Error('Already sold');
    await tx.query(`UPDATE tickets SET status = 'sold', user_id = $1 WHERE id = 1`, [userId]);
    return 'sold';
  });
}

heading('Real SQL: lock, check, write, commit');
show('user 41', await buy(41));
const second = await buy(42).catch((e) => e.message);
show('user 42', second);
assert.equal(second, 'Already sold');
assert.equal((await one(db, 'SELECT user_id FROM tickets WHERE id = 1')).user_id, 41);

heading('Simulation: what the second buyer experiences concurrently');
const lm = new LockManager();
let status = 'available';
step('A', `SELECT ... FOR UPDATE -> ${lm.acquire('A', 'ticket1')}`);
step('B', `SELECT ... FOR UPDATE -> ${lm.acquire('B', 'ticket1')} (blocked, not failed)`);
assert.equal(lm.waitingFor.get('B'), 'ticket1');
status = 'sold'; step('A', 'status is available -> UPDATE sold; COMMIT');
const woken = lm.releaseAll('A');
step('B', `wakes (${woken}), re-reads status = '${status}' -> "Already sold"`);
assert.deepEqual(woken, ['B']);

heading('NOWAIT / SKIP LOCKED: don\'t queue behind a hot row');
await db.query('BEGIN');
const r = await db.query('SELECT id FROM tickets WHERE id = 1 FOR UPDATE NOWAIT');
await db.query('COMMIT');
show('FOR UPDATE NOWAIT (free row) rows', r.rows.length);
console.log('  On a locked row NOWAIT raises 55P03 lock_not_available immediately instead of waiting.');
console.log('\nBest for hot rows (inventory, seats, wallets). Keep the transaction short: others are waiting.');

await db.close();
console.log('\nOK');
