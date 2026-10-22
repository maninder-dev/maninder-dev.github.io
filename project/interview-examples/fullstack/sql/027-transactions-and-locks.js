// Topic 27: Transactions and Locks in PostgreSQL  (Full-Stack Handbook, Part 2)
// Run: npm run ex 27       (or: node 027-transactions-and-locks.js)
// What it shows: real SELECT ... FOR UPDATE inside a transaction and the locks it holds (pg_locks),
// the seat-booking pattern, and the FOR UPDATE SKIP LOCKED job-queue query. Two workers competing
// for jobs is a simulation (PGlite has one connection), using the same lock rules.
import assert from 'node:assert/strict';
import { createDb, all, one, heading, show } from './lib/db.js';
import { LockManager, step } from './lib/sim.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE seats (id INT PRIMARY KEY, booked_by INT);
  INSERT INTO seats SELECT g, NULL FROM generate_series(1, 100) g;
  CREATE TABLE jobs (id SERIAL PRIMARY KEY, status TEXT NOT NULL DEFAULT 'queued');
  INSERT INTO jobs (status) SELECT 'queued' FROM generate_series(1, 5);
`);

heading('Seat booking: lock the row, check, then write');
await db.query('BEGIN');
const seat = await one(db, 'SELECT * FROM seats WHERE id = 7 FOR UPDATE');
const locks = await all(db, `SELECT relation::regclass::text AS rel, mode FROM pg_locks
                             WHERE relation::regclass::text IN ('seats', 'seats_pkey') ORDER BY 1`);
show('locks held while the transaction is open', locks);
assert.ok(locks.some((l) => l.rel === 'seats' && l.mode === 'RowShareLock'), 'FOR UPDATE takes RowShareLock on the table + a row lock');
assert.equal(seat.booked_by, null);
await db.query('UPDATE seats SET booked_by = 42 WHERE id = 7');
await db.query('COMMIT');
const after = await all(db, `SELECT count(*)::int AS n FROM pg_locks WHERE relation = 'seats'::regclass`);
show('locks on seats after COMMIT', after[0].n);
assert.equal(after[0].n, 0, 'all locks released at commit');

heading('Row locks are recorded on the tuple itself (xmax), not in pg_locks');
await db.query('BEGIN');
await db.query('SELECT * FROM seats WHERE id = 8 FOR UPDATE');
const xid = (await one(db, 'SELECT txid_current()::text AS x')).x;
const lockedRow = await one(db, 'SELECT xmax::text FROM seats WHERE id = 8');
show(`seat 8 xmax while locked by transaction ${xid}`, lockedRow.xmax);
assert.equal(lockedRow.xmax, xid);
await db.query('COMMIT');

heading('Job queue query (real SQL): claim the next free job');
const claim = `UPDATE jobs SET status = 'running' WHERE id = (
  SELECT id FROM jobs WHERE status = 'queued' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING id`;
show('claimed job', (await one(db, claim)).id);

heading('Simulation: two workers, FOR UPDATE vs FOR UPDATE SKIP LOCKED');
const queued = [2, 3, 4, 5];
function nextJob(lm, worker, skipLocked) {
  for (const id of queued) {
    if (lm.holder.has(`job${id}`) && lm.holder.get(`job${id}`) !== worker) {
      if (skipLocked) continue;
      return { id, state: lm.acquire(worker, `job${id}`) };
    }
    return { id, state: lm.acquire(worker, `job${id}`) };
  }
}
let lm = new LockManager();
const a1 = nextJob(lm, 'A', false); step('A', `FOR UPDATE -> job ${a1.id} ${a1.state}`);
const b1 = nextJob(lm, 'B', false); step('B', `FOR UPDATE -> job ${b1.id} ${b1.state}`);
assert.equal(b1.state, 'waiting', 'plain FOR UPDATE: worker B is stuck behind A');
lm = new LockManager();
const a2 = nextJob(lm, 'A', true); step('A', `SKIP LOCKED -> job ${a2.id} ${a2.state}`);
const b2 = nextJob(lm, 'B', true); step('B', `SKIP LOCKED -> job ${b2.id} ${b2.state}`);
assert.deepEqual([a2.id, b2.id, b2.state], [2, 3, 'granted'], 'workers run in parallel');

await db.close();
console.log('\nOK');
