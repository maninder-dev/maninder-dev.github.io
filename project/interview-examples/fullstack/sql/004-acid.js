// Topic 4: ACID Properties  (Full-Stack Handbook, Part 1)
// Run: npm run ex 4        (or: node 004-acid.js)
// What it shows: Atomicity (a failed transfer debits nothing), Consistency (a CHECK constraint
// aborts an overdraft), Isolation (see topics 11/28), Durability (committed data survives closing
// and reopening the database directory).
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDb, one, heading, show, expectPgError } from './lib/db.js';

const dataDir = mkdtempSync(join(tmpdir(), 'acid-'));
let db = await createDb(dataDir);
await db.exec(`
  CREATE TABLE accounts (id INT PRIMARY KEY, balance INT NOT NULL CHECK (balance >= 0));
  INSERT INTO accounts VALUES (1, 5000), (2, 1000);
`);
const balances = async () => (await db.query('SELECT id, balance FROM accounts ORDER BY id')).rows.map((r) => r.balance);

heading('Atomicity: an error halfway through a transfer');
await db.query('BEGIN');
await db.query('UPDATE accounts SET balance = balance - 1000 WHERE id = 1');
await expectPgError(() => db.query('UPDATE accounts SET balance = balance + 1000 / 0 WHERE id = 2'), '22012');
await db.query('ROLLBACK');
show('balances', await balances());
assert.deepEqual(await balances(), [5000, 1000], 'the debit was undone with the failed credit');

heading('Consistency: the CHECK constraint refuses an overdraft');
const err = await expectPgError(() => db.transaction(async (tx) => {
  await tx.query('UPDATE accounts SET balance = balance + 9000 WHERE id = 2');
  await tx.query('UPDATE accounts SET balance = balance - 9000 WHERE id = 1');
}), '23514');
show('error', err.message);
assert.deepEqual(await balances(), [5000, 1000]);

heading('A correct transfer commits both updates together');
await db.transaction(async (tx) => {
  await tx.query('UPDATE accounts SET balance = balance - 1000 WHERE id = 1');
  await tx.query('UPDATE accounts SET balance = balance + 1000 WHERE id = 2');
});
show('balances', await balances());
assert.deepEqual(await balances(), [4000, 2000]);

heading('Durability: close the database, open the same directory again');
await db.close();
db = await createDb(dataDir);
show('balances after reopen', await balances());
assert.deepEqual(await balances(), [4000, 2000]);
assert.equal((await one(db, 'SELECT sum(balance)::int AS s FROM accounts')).s, 6000, 'money is neither created nor destroyed');
await db.close();
rmSync(dataDir, { recursive: true, force: true });
console.log('\nOK');
