// Topic 224: System Design Questions - avoiding a cache stampede  (Full-Stack Handbook, Part 11)
// Run: npm run ex 224        (or: node 224-cache-stampede.js)
// What it shows: 50 concurrent requests for a cold key. Without protection all 50 hit the database; with
// a lock (SET NX PX) one request rebuilds and the rest wait for it. TTL jitter spreads expiry so keys
// cached together don't all expire together. Redis is ioredis-mock (in-process, same command API).
import assert from 'node:assert/strict';
import Redis from 'ioredis-mock';
import { sleep } from './lib.js';

const redis = new Redis();
let dbQueries = 0;
const loadProduct = async () => { dbQueries++; await sleep(50); return { id: 42, name: 'Phone', price: 19999 }; };

// Naive cache-aside: every miss goes to the DB
async function getNaive(key, ttl, loader) {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);
  const value = await loader();
  await redis.set(key, JSON.stringify(value), 'EX', ttl);
  return value;
}

// The handbook's version: one builder holds a short lock, everyone else waits and re-reads
async function getCached(key, ttl, loader) {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);
  const gotLock = await redis.set(`lock:${key}`, '1', 'PX', 5000, 'NX');   // expires even if we crash
  if (!gotLock) { await sleep(20); return getCached(key, ttl, loader); }   // wait for the builder
  try {
    const value = await loader();
    const jitter = Math.floor(Math.random() * 60);
    await redis.set(key, JSON.stringify(value), 'EX', ttl + jitter);
    return value;
  } finally { await redis.del(`lock:${key}`); }
}

// Stampede without protection
let results = await Promise.all(Array.from({ length: 50 }, () => getNaive('product:42:naive', 300, loadProduct)));
console.log(`naive  : 50 concurrent misses -> ${dbQueries} DB queries`);
assert.equal(dbQueries, 50);
assert.ok(results.every((r) => r.id === 42));

// With the lock
dbQueries = 0;
results = await Promise.all(Array.from({ length: 50 }, () => getCached('product:42', 300, loadProduct)));
console.log(`locked : 50 concurrent misses -> ${dbQueries} DB query, everyone got`, results[49]);
assert.equal(dbQueries, 1);
assert.ok(results.every((r) => r.price === 19999));
assert.equal(await redis.exists('lock:product:42'), 0, 'lock released');

// Jitter: 20 keys cached at the same moment get different TTLs, so they don't expire in the same second
for (let i = 0; i < 20; i++) await getCached(`category:${i}`, 300, async () => ({ i }));
const ttls = await Promise.all(Array.from({ length: 20 }, (_, i) => redis.ttl(`category:${i}`)));
const distinct = new Set(ttls).size;
console.log(`jitter : 20 keys, TTLs between ${Math.min(...ttls)} and ${Math.max(...ttls)} s, ${distinct} distinct values`);
assert.ok(ttls.every((t) => t >= 299 && t <= 360));
assert.ok(distinct > 5, 'expiries are spread out');

// Refresh-ahead for very hot keys: rebuild in the background before expiry, so readers never miss
async function getWithEarlyRefresh(key, ttl, loader, refreshBelow = 30) {
  const [hit, left] = await Promise.all([redis.get(key), redis.ttl(key)]);
  if (hit && left < refreshBelow) getCached(`${key}:refresh`, 1, async () => {        // lock-protected, fire-and-forget
    const v = await loader(); await redis.set(key, JSON.stringify(v), 'EX', ttl); return v;
  });
  return hit ? JSON.parse(hit) : getCached(key, ttl, loader);
}
await redis.set('hot', JSON.stringify({ v: 1 }), 'EX', 10);                // about to expire
dbQueries = 0;
const served = await getWithEarlyRefresh('hot', 300, loadProduct);
assert.deepEqual(served, { v: 1 }, 'reader served the cached value immediately');
await sleep(100);
assert.ok((await redis.ttl('hot')) > 250, 'TTL was extended in the background');
assert.equal(dbQueries, 1);
console.log('refresh: hot key served from cache and refreshed in the background before it expired');

redis.disconnect();
console.log('OK: one rebuild per key, jittered TTLs, refresh-ahead');
