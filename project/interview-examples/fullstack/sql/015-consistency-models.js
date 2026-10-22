// Topic 15: Data Consistency Models  (Full-Stack Handbook, Part 1)
// Run: npm run ex 15       (or: node 015-consistency-models.js)
// What it shows (simulation): a primary and a lagging replica (two PGlite databases). Reading from
// the replica right after a write is stale (eventual consistency); routing the writer's next read
// to the primary gives read-your-writes. Shipping changes in order preserves causality.
import assert from 'node:assert/strict';
import { createDb, one, heading, show } from './lib/db.js';

const primary = await createDb();
const replica = await createDb();
for (const d of [primary, replica]) {
  await d.exec(`CREATE TABLE users (id INT PRIMARY KEY, name TEXT); INSERT INTO users VALUES (1, 'Anna');
                CREATE TABLE comments (id INT PRIMARY KEY, parent_id INT, body TEXT);`);
}
const replicationLog = []; // statements not yet applied on the replica (async replication lag)
async function write(sql, params) {
  await primary.query(sql, params);
  replicationLog.push([sql, params]);
}
async function replicateAll() {
  while (replicationLog.length) { const [sql, p] = replicationLog.shift(); await replica.query(sql, p); }
}
const nameOn = async (d) => (await one(d, 'SELECT name FROM users WHERE id = 1')).name;

heading('Eventual consistency: the replica lags behind');
await write('UPDATE users SET name = $1 WHERE id = $2', ['Ann', 1]);
show('primary', await nameOn(primary));
show('replica', await nameOn(replica));
assert.equal(await nameOn(replica), 'Anna', 'stale read');
await replicateAll();
show('replica after catching up', await nameOn(replica));
assert.equal(await nameOn(replica), 'Ann');

heading('Read-your-writes: after a user writes, route that user\'s reads to the primary');
const recentWriters = new Map(); // userId -> time of last write
const STICKY_MS = 5000;
async function updateName(userId, name) {
  await write('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);
  recentWriters.set(userId, Date.now());
}
const dbForRead = (userId) => (Date.now() - (recentWriters.get(userId) ?? 0) < STICKY_MS ? primary : replica);
await updateName(1, 'Annie');
const seen = await nameOn(dbForRead(1));
show('user 1 sees own change', seen);
assert.equal(seen, 'Annie');
show('another user (replica) still sees', await nameOn(replica));

heading('Causal consistency: apply changes in order so a reply never precedes its comment');
await write('INSERT INTO comments VALUES (1, NULL, $1)', ['Great post']);
await write('INSERT INTO comments VALUES (2, 1, $1)', ['Thanks!']);
await replicateAll(); // ordered log -> the parent always arrives first
const orphans = await one(replica, `SELECT count(*)::int AS n FROM comments c
  WHERE parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM comments p WHERE p.id = c.parent_id)`);
show('replies without their parent on the replica', orphans.n);
assert.equal(orphans.n, 0);

await primary.close(); await replica.close();
console.log('\nOK');
