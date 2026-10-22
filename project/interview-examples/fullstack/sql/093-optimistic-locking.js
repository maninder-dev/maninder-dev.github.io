// Topic 93: Optimistic Locking  (Full-Stack Handbook, Part 5)
// Run: npm run ex 93       (or: node 093-optimistic-locking.js)
// What it shows: a version column. Two users read version 0 (interleaved on one PGlite connection);
// the first UPDATE ... WHERE version = 0 wins and bumps it to 1; the second matches 0 rows and must
// retry or report "already sold". No locks are held between read and write.
import assert from 'node:assert/strict';
import { createDb, one, heading, show } from './lib/db.js';
import { step } from './lib/sim.js';

const db = await createDb();
await db.exec(`CREATE TABLE tickets (id INT PRIMARY KEY, status TEXT NOT NULL, user_id INT, version INT NOT NULL DEFAULT 0);
               INSERT INTO tickets (id, status) VALUES (1, 'available'), (2, 'available');`);
const findByPk = (id) => one(db, 'SELECT * FROM tickets WHERE id = $1', [id]);

// Same shape as the handbook's Ticket.update(..., { where: { id, version, status } })
async function sell(ticket, userId) {
  const r = await db.query(
    `UPDATE tickets SET status = 'sold', user_id = $1, version = version + 1
     WHERE id = $2 AND version = $3 AND status = 'available'`, [userId, ticket.id, ticket.version]);
  if (r.affectedRows === 0) throw new Error('Ticket already sold, please retry');
  return 'sold';
}

heading('Two buyers, one ticket');
const tA = await findByPk(1); step('A', `read ticket 1, version ${tA.version}`);
const tB = await findByPk(1); step('B', `read ticket 1, version ${tB.version}`);
step('A', `UPDATE ... WHERE version = ${tA.version} -> ${await sell(tA, 41)}`);
let error;
try { await sell(tB, 42); } catch (e) { error = e.message; }
step('B', `UPDATE ... WHERE version = ${tB.version} -> 0 rows: ${error}`);
assert.equal(error, 'Ticket already sold, please retry');
const final = await findByPk(1);
show('ticket 1', final);
assert.deepEqual([final.user_id, final.version], [41, 1]);

heading('Retry loop for edits that can succeed on fresh data (rename a seat label)');
await db.query('ALTER TABLE tickets ADD COLUMN label TEXT');
let attempts = 0;
async function rename(id, label, interfere) {
  for (;;) {
    attempts++;
    const t = await findByPk(id);
    if (interfere && attempts === 1) await db.query('UPDATE tickets SET label = $1, version = version + 1 WHERE id = $2', ['changed by B', id]);
    const r = await db.query('UPDATE tickets SET label = $1, version = version + 1 WHERE id = $2 AND version = $3', [label, id, t.version]);
    if (r.affectedRows === 1) return;
    console.log(`  attempt ${attempts}: version moved on, re-reading`);
  }
}
await rename(2, 'Row A, seat 12', true);
show('attempts', attempts);
show('ticket 2', await findByPk(2));
assert.equal(attempts, 2);
assert.equal((await findByPk(2)).version, 2);
console.log('\nBest when conflicts are rare. ORMs: Sequelize { version: true }, Mongoose optimisticConcurrency.');

await db.close();
console.log('\nOK');
