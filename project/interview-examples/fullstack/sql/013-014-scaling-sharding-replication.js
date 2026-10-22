// Topics 13-14: Horizontal vs Vertical Scaling; Sharding vs Replication  (Full-Stack Handbook, Part 1)
// Run: npm run ex 13       (or: node 013-014-scaling-sharding-replication.js)
// What it shows (simulation with three real PGlite databases as "servers"): hash sharding by user_id
// splits writes and storage; replication copies the same rows so reads can be spread out.
import assert from 'node:assert/strict';
import { createDb, one, heading, show } from './lib/db.js';

const shardFor = (userId, shardCount) => userId % shardCount; // from the handbook
// The handbook comment says "user 1_000_007 -> shard 1 of 3"; the arithmetic actually gives 2.
assert.equal(shardFor(1_000_007, 3), 2);

const shards = await Promise.all([0, 1, 2].map(() => createDb()));
for (const s of shards) await s.exec('CREATE TABLE users (id INT PRIMARY KEY, name TEXT NOT NULL)');

heading('Sharding: each user lives on exactly one server');
for (let id = 1; id <= 3000; id++) {
  await shards[shardFor(id, 3)].query('INSERT INTO users VALUES ($1, $2)', [id, `user ${id}`]);
}
const counts = [];
for (const s of shards) counts.push((await one(s, 'SELECT count(*)::int AS n FROM users')).n);
show('rows per shard', counts);
assert.deepEqual(counts, [1000, 1000, 1000], 'writes and storage are split three ways');
const u = await one(shards[shardFor(1234, 3)], 'SELECT * FROM users WHERE id = 1234');
show('lookup user 1234 -> shard ' + shardFor(1234, 3), u);
assert.equal(u.name, 'user 1234');
console.log('Cost: a query without the shard key (e.g. by name) must ask every shard (scatter-gather).');

heading('Replication: same data on several servers, reads spread round-robin');
const primary = shards[0];
const replicas = [await createDb(), await createDb()];
for (const r of replicas) await r.exec('CREATE TABLE users (id INT PRIMARY KEY, name TEXT NOT NULL)');
const replicate = async (sql, params) => { for (const r of replicas) await r.query(sql, params); };
await primary.query(`INSERT INTO users VALUES (9000, 'replicated user')`);
await replicate(`INSERT INTO users VALUES (9000, 'replicated user')`);
let next = 0;
const readReplica = () => replicas[next++ % replicas.length];
const served = [];
for (let i = 0; i < 4; i++) {
  const r = readReplica();
  served.push(replicas.indexOf(r));
  assert.equal((await one(r, 'SELECT name FROM users WHERE id = 9000')).name, 'replicated user');
}
show('reads served by replica', served);
assert.deepEqual(served, [0, 1, 0, 1]);
console.log('Replication scales reads and survives a server loss; sharding scales writes and storage.');
console.log('Vertical scaling = one bigger machine (simple, has a ceiling). Start there.');

for (const d of [...shards, ...replicas]) await d.close();
console.log('\nOK');
