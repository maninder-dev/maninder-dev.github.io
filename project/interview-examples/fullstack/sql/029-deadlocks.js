// Topic 29: Deadlocks - How They Occur  (Full-Stack Handbook, Part 2)
// Run: npm run ex 29       (or: node 029-deadlocks.js)
// What it shows (simulation of two sessions with a lock manager that detects wait-for cycles like
// PostgreSQL's): opposite-order transfers deadlock and one is aborted with 40P01; locking rows in
// ascending id order removes the cycle. The ordered-locking SQL from the handbook runs for real.
import assert from 'node:assert/strict';
import { createDb, all, heading, show } from './lib/db.js';
import { LockManager, step } from './lib/sim.js';

heading('A: transfer 1 -> 2 locks id 1 then 2; B: transfer 2 -> 1 locks id 2 then 1');
let lm = new LockManager();
step('A', `UPDATE ... WHERE id=1 -> ${lm.acquire('A', 'id1')}`);
step('B', `UPDATE ... WHERE id=2 -> ${lm.acquire('B', 'id2')}`);
step('A', `UPDATE ... WHERE id=2 -> ${lm.acquire('A', 'id2')}`);
let deadlock;
try { lm.acquire('B', 'id1'); } catch (e) { deadlock = e; }
step('B', `UPDATE ... WHERE id=1 -> ERROR ${deadlock.code}: ${deadlock.message}`);
assert.equal(deadlock?.code, '40P01');
const woken = lm.releaseAll('B'); step('B', 'transaction aborted, locks released');
step('A', `wakes up (${woken.join(', ')}) and commits`);
assert.deepEqual(woken, ['A']);

heading('Fix: always lock in ascending id order');
const lockOrder = (from, to) => [from, to].sort((a, b) => a - b);
lm = new LockManager();
const [a1, a2] = lockOrder(1, 2), [b1, b2] = lockOrder(2, 1);
step('A', `lock id${a1} -> ${lm.acquire('A', `id${a1}`)}`);
step('B', `lock id${b1} -> ${lm.acquire('B', `id${b1}`)}`);
step('A', `lock id${a2} -> ${lm.acquire('A', `id${a2}`)}`);
step('A', 'COMMIT');
const next = lm.releaseAll('A');
assert.deepEqual(next, ['B'], 'B simply waited its turn, no cycle possible');
step('B', `now holds id${b1}; lock id${b2} -> ${lm.acquire('B', `id${b2}`)}; COMMIT`);

heading('Real SQL: lock both rows in one ordered statement, then transfer');
const db = await createDb();
await db.exec('CREATE TABLE accounts (id INT PRIMARY KEY, balance INT NOT NULL); INSERT INTO accounts VALUES (1, 1000), (2, 1000);');
async function transfer(fromId, toId, amount) {
  const [first, second] = [fromId, toId].sort((a, b) => a - b);
  await db.transaction(async (tx) => {
    await tx.query('SELECT 1 FROM accounts WHERE id = ANY($1) ORDER BY id FOR UPDATE', [[first, second]]);
    await tx.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
    await tx.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
  });
}
await transfer(1, 2, 300);
await transfer(2, 1, 100);
const rows = await all(db, 'SELECT id, balance FROM accounts ORDER BY id');
show('balances', rows);
assert.deepEqual(rows.map((r) => r.balance), [800, 1200]);
await db.close();
console.log('Also: keep transactions short and retry on 40P01.');
console.log('\nOK');
