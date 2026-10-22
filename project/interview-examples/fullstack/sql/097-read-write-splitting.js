// Topic 97: Read/Write Splitting  (Full-Stack Handbook, Part 5)
// Run: npm run ex 97       (or: node 097-read-write-splitting.js)
// What it shows (simulation: three PGlite databases as primary + 2 replicas with async lag): a
// router that sends writes to the primary and SELECTs round-robin to replicas, the stale read right
// after a write, and the fix - useMaster for read-your-writes (like Sequelize's option).
import assert from 'node:assert/strict';
import { createDb, heading, show } from './lib/db.js';

const schema = `CREATE TABLE users (id INT PRIMARY KEY, name TEXT NOT NULL); INSERT INTO users VALUES (1, 'Anna');`;
const primary = await createDb();
const replicas = [await createDb(), await createDb()];
for (const d of [primary, ...replicas]) await d.exec(schema);
const backlog = []; // WAL not yet replayed on the replicas

const router = {
  next: 0, served: { primary: 0, replica0: 0, replica1: 0 },
  async query(sql, params = [], { useMaster = false } = {}) {
    const isRead = /^\s*select/i.test(sql);
    if (!isRead) {
      backlog.push([sql, params]);
      this.served.primary++;
      return primary.query(sql, params);
    }
    if (useMaster) { this.served.primary++; return primary.query(sql, params); }
    const i = this.next++ % replicas.length;
    this.served[`replica${i}`]++;
    return replicas[i].query(sql, params);
  },
};
const replicate = async () => { for (const [s, p] of backlog.splice(0)) for (const r of replicas) await r.query(s, p); };
const findName = async (opts) => (await router.query('SELECT name FROM users WHERE id = $1', [1], opts)).rows[0].name;

heading('Reads spread across replicas');
for (let i = 0; i < 4; i++) await findName();
show('served', router.served);
assert.deepEqual(router.served, { primary: 0, replica0: 2, replica1: 2 });

heading('Write, then read immediately (replication lag)');
await router.query('UPDATE users SET name = $1 WHERE id = $2', ['Ann', 1]);
const stale = await findName();
show('read from a replica', stale);
assert.equal(stale, 'Anna', 'the user does not see their own change');

heading('Read-your-writes: force the primary right after a write');
const fresh = await findName({ useMaster: true });
show('read with { useMaster: true }', fresh);
assert.equal(fresh, 'Ann');

heading('Once replicas catch up, normal routing is fine again');
await replicate();
show('replica read', await findName());
assert.equal(await findName(), 'Ann');

for (const d of [primary, ...replicas]) await d.close();
console.log('\nOK');
