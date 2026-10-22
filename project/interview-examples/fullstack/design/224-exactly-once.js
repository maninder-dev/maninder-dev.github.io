// Topic 224: System Design Questions - processing a message exactly once  (Full-Stack Handbook, Part 11)
// Run: npm run ex 224        (or: node 224-exactly-once.js)
// What it shows: an at-least-once broker redelivers messages (here: every message twice, shuffled, plus a
// crash mid-handler). A naive consumer double-applies them; an idempotent consumer that records message
// IDs under a UNIQUE constraint in the SAME transaction as the update ends with exactly-once effects.
// Database: PostgreSQL via PGlite (in-process).
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
await db.exec(`
  CREATE TABLE wallets (user_id int PRIMARY KEY, balance int NOT NULL);
  CREATE TABLE processed_messages (id text PRIMARY KEY, processed_at timestamptz DEFAULT now());
  INSERT INTO wallets VALUES (1, 0);`);

const messages = Array.from({ length: 10 }, (_, i) => ({ id: `msg-${i}`, userId: 1, amount: 100 }));
// At-least-once delivery: duplicates and reordering happen (consumer restarts, ack timeouts, rebalances)
const deliveries = [...messages, ...messages].sort(() => Math.random() - 0.5);
const balance = async () => (await db.query('SELECT balance FROM wallets WHERE user_id = 1')).rows[0].balance;

// Naive: increments every delivery
async function naive(msg) { await db.query('UPDATE wallets SET balance = balance + $1 WHERE user_id = $2', [msg.amount, msg.userId]); }
for (const m of deliveries) await naive(m);
console.log(`naive consumer      : ${deliveries.length} deliveries -> balance ${await balance()} (expected 1000)`);
assert.equal(await balance(), 2000);

// Idempotent: dedupe row + effect in one transaction
await db.exec('UPDATE wallets SET balance = 0');
let skipped = 0;
async function handle(msg, { crashAfterUpdate = false } = {}) {
  try {
    await db.transaction(async (tx) => {
      await tx.query('INSERT INTO processed_messages(id) VALUES ($1)', [msg.id]);   // UNIQUE: 2nd time throws 23505
      await tx.query('UPDATE wallets SET balance = balance + $1 WHERE user_id = $2', [msg.amount, msg.userId]);
      if (crashAfterUpdate) throw new Error('worker crashed before commit');
    });
  } catch (e) {
    if (e.code === '23505') { skipped++; return 'duplicate'; }                      // already handled: ack and move on
    throw e;                                                                        // real failure: don't ack, broker redelivers
  }
  return 'applied';
}

// A crash after the UPDATE but before commit: both writes roll back together, so the redelivery applies it
await assert.rejects(handle(messages[0], { crashAfterUpdate: true }), /crashed/);
assert.equal(await balance(), 0, 'nothing half-applied');
for (const m of deliveries) await handle(m);
console.log(`idempotent consumer : ${deliveries.length} deliveries + 1 crash -> balance ${await balance()}, ${skipped} duplicates skipped`);
assert.equal(await balance(), 1000);
assert.equal(skipped, 10);
assert.equal((await db.query('SELECT count(*)::int AS n FROM processed_messages')).rows[0].n, 10);

// Why the same transaction matters: if the dedupe insert committed separately and the update then failed,
// the message would be marked done but never applied (lost). If the update committed first, a crash before
// the insert means the redelivery applies it again (doubled).

// Alternative: make the update naturally idempotent (absolute SET instead of increment)
await db.exec(`CREATE TABLE orders (id int PRIMARY KEY, status text); INSERT INTO orders VALUES (5, 'pending');`);
const markPaid = (orderId) => db.query("UPDATE orders SET status = 'paid' WHERE id = $1 AND status = 'pending'", [orderId]);
const r1 = await markPaid(5);
const r2 = await markPaid(5);
console.log(`absolute SET        : first delivery changed ${r1.affectedRows} row, second changed ${r2.affectedRows}`);
assert.equal(r1.affectedRows, 1);
assert.equal(r2.affectedRows, 0);

await db.close();
console.log('OK: at-least-once delivery + idempotent consumer = effectively exactly-once');
