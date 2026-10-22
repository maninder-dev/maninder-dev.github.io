// Topic 91: MVCC Compared: PostgreSQL vs InnoDB vs MongoDB  (Full-Stack Handbook, Part 5)
// Run: npm run ex 91       (or: node 091-mvcc-compared.js)
// What it shows: PostgreSQL's approach for real (an UPDATE appends a new tuple at a new ctid; the
// old one stays in the heap until VACUUM), next to a simulation of InnoDB's approach (update in
// place, old version moved to an undo log). Both give a reader its snapshot without blocking.
import assert from 'node:assert/strict';
import { createDb, all, one, heading, show } from './lib/db.js';

heading('PostgreSQL (real): new tuple per update, old one dead in the heap');
const db = await createDb();
await db.exec(`CREATE TABLE accounts (id INT PRIMARY KEY, balance INT) WITH (autovacuum_enabled = off, fillfactor = 50);
               INSERT INTO accounts VALUES (1, 100);`);
const ctids = [];
for (const b of [150, 200, 250]) {
  ctids.push((await one(db, `SELECT ctid::text FROM accounts WHERE id = 1`)).ctid);
  await db.query('UPDATE accounts SET balance = $1 WHERE id = 1', [b]);
}
ctids.push((await one(db, `SELECT ctid::text FROM accounts WHERE id = 1`)).ctid);
show('ctid of the live version after each update', ctids);
assert.equal(new Set(ctids).size, 4, 'four physical versions written');
show('live rows', (await all(db, 'SELECT * FROM accounts')));

heading('InnoDB (simulation): update in place, previous version pushed to the undo log');
class InnoDbRow {
  constructor(value, trx) { this.value = value; this.trx = trx; this.undo = []; }
  update(value, trx) { this.undo.unshift({ value: this.value, trx: this.trx }); this.value = value; this.trx = trx; }
  readAsOf(snapshotTrx) { // follow the undo chain back to a version the snapshot may see
    if (this.trx <= snapshotTrx) return this.value;
    return this.undo.find((v) => v.trx <= snapshotTrx)?.value;
  }
  purge(oldestSnapshot) { this.undo = this.undo.filter((v, i) => i === 0 || v.trx > oldestSnapshot); }
}
const row = new InnoDbRow(100, 10);
const readerSnapshot = 10; // a long-running reader started here
row.update(150, 11); row.update(200, 12); row.update(250, 13);
show('row in the table (always the newest)', row.value);
show('undo log chain', row.undo);
show('old reader (snapshot 10) reads', row.readAsOf(readerSnapshot));
assert.equal(row.value, 250);
assert.equal(row.readAsOf(readerSnapshot), 100);
assert.equal(row.readAsOf(12), 200);
row.purge(13);
show('after purge (no snapshot older than 13)', row.undo.length + ' undo record(s) kept');

console.log(`
  PostgreSQL : new tuple in the heap; old one dead until VACUUM        -> table bloat risk
  InnoDB     : in place; old versions in the undo log, purge thread    -> long readers grow the undo log
  MongoDB    : WiredTiger update chains in memory; snapshots for reads -> cache pressure
  All three  : readers don't block writers, writers don't block readers`);
await db.close();
console.log('\nOK');
