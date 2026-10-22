// Topic 10: Concurrency Control  (Full-Stack Handbook, Part 1)
// Run: npm run ex 10       (or: node 010-concurrency-control.js)
// What it shows (simulation of two sessions on one PGlite connection, statements interleaved by
// hand): the lost update from read-modify-write in app code, then the fix - one atomic UPDATE.
// Dirty / non-repeatable / phantom reads are shown in 011-isolation-levels.js.
import assert from 'node:assert/strict';
import { createDb, one, heading } from './lib/db.js';
import { step } from './lib/sim.js';

const db = await createDb();
await db.exec(`CREATE TABLE accounts (id INT PRIMARY KEY, balance INT NOT NULL); INSERT INTO accounts VALUES (1, 100);`);
const read = async () => (await one(db, 'SELECT balance FROM accounts WHERE id = 1')).balance;

heading('Lost update: both sessions read 100, both add 50, both write 150');
const a = await read(); step('A', `SELECT balance -> ${a}`);
const b = await read(); step('B', `SELECT balance -> ${b}`);
await db.query('UPDATE accounts SET balance = $1 WHERE id = 1', [a + 50]); step('A', `UPDATE balance = ${a + 50}`);
await db.query('UPDATE accounts SET balance = $1 WHERE id = 1', [b + 50]); step('B', `UPDATE balance = ${b + 50}`);
const lost = await read();
console.log(`  final balance: ${lost} (expected 200 -> one deposit vanished)`);
assert.equal(lost, 150);

heading('Fix: let the database do read+write in one atomic statement');
await db.query('UPDATE accounts SET balance = 100 WHERE id = 1');
await db.query('UPDATE accounts SET balance = balance + 50 WHERE id = 1'); step('A', 'UPDATE balance = balance + 50');
await db.query('UPDATE accounts SET balance = balance + 50 WHERE id = 1'); step('B', 'UPDATE balance = balance + 50');
const fixed = await read();
console.log(`  final balance: ${fixed}`);
assert.equal(fixed, 200);
console.log('  In real concurrency B would block on A\'s row lock, then re-read the committed 150 and add 50.');

await db.close();
console.log('\nOK');
