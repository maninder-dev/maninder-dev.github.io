// Topic 71: Sharding (Scaling)  (Full-Stack Handbook, Part 3)
// Run: npm run ex 71        (or: node 071-sharding-simulation.js)
// What it shows: SIMULATION. One machine can't run a real sharded cluster (config servers +
// mongos + several shard replica sets), so this models what mongos does: route documents to chunks
// by shard key. It compares a hashed key, a range key on a timestamp (hot shard) and a compound
// range key, and shows targeted vs scatter-gather queries. No MongoDB server is needed.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { section } from './lib/db.js';

const SHARDS = ['shardA', 'shardB', 'shardC', 'shardD'];

// Hashed sharding: MongoDB hashes the key (md5-based, 64-bit) and splits the hash space into chunks.
const hash64 = (v) => createHash('md5').update(String(v)).digest().readBigInt64LE(0);
const hashedRouter = (key) => (doc) => {
  const h = hash64(doc[key]);
  const span = 2n ** 64n / BigInt(SHARDS.length);
  return SHARDS[Number((h + 2n ** 63n) / span)];
};

// Range sharding: config servers hold [min, max) chunk boundaries -> shard. Chunks for the
// "future" all sit on the last shard until the balancer splits and moves them.
const rangeRouter = (key, boundaries) => (doc) => {
  const i = boundaries.findIndex((b) => doc[key] < b);
  return SHARDS[i === -1 ? SHARDS.length - 1 : i];
};

const spread = (docs, route) => {
  const count = Object.fromEntries(SHARDS.map((s) => [s, 0]));
  for (const d of docs) count[route(d)]++;
  return count;
};
const maxShare = (count) => Math.max(...Object.values(count)) / Object.values(count).reduce((a, b) => a + b);

// Historic chunk boundaries were set when the data looked like last year's.
const DAY = 86_400_000;
const start = Date.UTC(2025, 0, 1);
const tsBounds = [start + 90 * DAY, start + 180 * DAY, start + 270 * DAY]; // 3 boundaries -> 4 chunks

// Today's insert traffic: 10 000 new orders from 5 000 users, all with "now" timestamps.
const now = Date.UTC(2026, 9, 15);
const inserts = Array.from({ length: 10_000 }, (_, i) => ({ userId: `u${i % 5000}`, region: ['in', 'eu', 'us', 'sg'][i % 4], createdAt: now + i * 1000 }));

section('Insert distribution by shard key');
const hashed = spread(inserts, hashedRouter('userId'));
const byTime = spread(inserts, rangeRouter('createdAt', tsBounds));
const regionIdx = { eu: 0, in: 1, sg: 2, us: 3 };
const byRegionTime = spread(inserts, (d) => SHARDS[regionIdx[d.region]]); // { region: 1, createdAt: 1 }, one region per chunk range
console.log('{ userId: "hashed" }          ', hashed);
console.log('{ createdAt: 1 } (monotonic)  ', byTime);
console.log('{ region: 1, createdAt: 1 }   ', byRegionTime);
assert.ok(maxShare(hashed) < 0.3, 'hashed key spreads writes evenly');
assert.equal(byTime.shardD, 10_000, 'monotonic key: every insert hits the last chunk = hot shard');
assert.equal(maxShare(byRegionTime), 0.25);
console.log(`hot shard: ${Math.round(maxShare(byTime) * 100)}% of writes on one shard with a timestamp-only key`);

section('Query routing: targeted vs scatter-gather');
// mongos can target only when the query contains the shard key (or its prefix for range keys).
function route(query, shardKey, router) {
  if (shardKey.every((k) => k in query)) return [router(query)];
  return SHARDS; // must ask every shard and merge results
}
const hr = hashedRouter('userId');
const q1 = route({ userId: 'u42' }, ['userId'], hr);
const q2 = route({ status: 'paid' }, ['userId'], hr);
console.log('find({ userId: "u42" })  ->', q1, '(targeted)');
console.log('find({ status: "paid" }) ->', q2, '(scatter-gather)');
assert.equal(q1.length, 1);
assert.equal(q2.length, SHARDS.length);

// Range queries: hashed keys lose locality, range keys keep it.
const rangeOfUsers = Array.from({ length: 100 }, (_, i) => ({ userId: `u${1000 + i}` }));
const shardsTouchedHashed = new Set(rangeOfUsers.map(hr)).size;
const userBounds = ['u2', 'u3', 'u4']; // range chunks on userId (string order)
const shardsTouchedRange = new Set(rangeOfUsers.map(rangeRouter('userId', userBounds))).size;
console.log(`userId u1000..u1099: hashed key touches ${shardsTouchedHashed} shards, range key touches ${shardsTouchedRange}`);
assert.equal(shardsTouchedHashed, SHARDS.length);
assert.equal(shardsTouchedRange, 1);

section('Shard key checklist');
const cardinality = (docs, k) => new Set(docs.map((d) => d[k])).size;
console.log({ userId: cardinality(inserts, 'userId'), region: cardinality(inserts, 'region') });
assert.ok(cardinality(inserts, 'region') <= 4, 'region alone: at most 4 chunks ever (jumbo chunks)');
console.log('good key = high cardinality + even writes + present in most queries');

/* The real commands (need a sharded cluster):
   sh.enableSharding("shop");
   sh.shardCollection("shop.orders", { userId: "hashed" });
   sh.shardCollection("shop.events", { region: 1, createdAt: 1 });
   db.orders.getShardDistribution();
*/
console.log('\nOK');
