// Topic 122: Caching with Redis in Node  (Full-Stack Handbook, Part 6)
// Run: npm run ex 122        (or: node 122-redis-caching.js)
// What it shows: route-level cache middleware (MISS then HIT, handler runs once, TTL set), and a
// sorted-set leaderboard. ioredis-mock gives the ioredis API in memory, no Redis server needed.
import assert from 'node:assert/strict';
import express from 'express';
import Redis from 'ioredis-mock';
import { serve } from './lib/serve.js';

const redis = new Redis(); // real app: new Redis(process.env.REDIS_URL) from 'ioredis'

const cache = (ttl) => async (req, res, next) => {
  const key = `cache:${req.originalUrl}`;
  const hit = await redis.get(key);
  if (hit) return res.set('X-Cache', 'HIT').json(JSON.parse(hit));
  const json = res.json.bind(res);
  res.json = (body) => { redis.set(key, JSON.stringify(body), 'EX', ttl); return json(body); };
  res.set('X-Cache', 'MISS');
  next();
};

let dbCalls = 0;
const listProducts = async (req, res) => {
  dbCalls++;
  await new Promise((r) => setTimeout(r, 50)); // pretend this is a slow query
  res.json([{ id: 1, name: 'Desk', page: req.query.page ?? '1' }]);
};

const app = express();
app.get('/api/products', cache(60), listProducts);
const { url, close } = await serve(app);

async function get(path) {
  const t = performance.now();
  const r = await fetch(url + path);
  const body = await r.json();
  const ms = performance.now() - t;
  console.log(`${path.padEnd(22)} ${r.headers.get('x-cache')}  ${ms.toFixed(0)} ms`);
  return { cache: r.headers.get('x-cache'), body };
}

const first = await get('/api/products');
const second = await get('/api/products');
const page2 = await get('/api/products?page=2');
assert.equal(first.cache, 'MISS');
assert.equal(second.cache, 'HIT');
assert.deepEqual(second.body, first.body);
assert.equal(page2.cache, 'MISS', 'the query string is part of the key');
assert.equal(dbCalls, 2);
const ttl = await redis.ttl('cache:/api/products');
console.log('TTL on cache:/api/products =', ttl, 's');
assert.ok(ttl > 0 && ttl <= 60);

// Invalidate on write
await redis.del('cache:/api/products');
assert.equal((await get('/api/products')).cache, 'MISS');

// Leaderboard with a sorted set
await redis.zadd('leaderboard', 1500, 'alice', 1720, 'bob', 990, 'carol');
await redis.zincrby('leaderboard', 300, 'carol');
const top = await redis.zrevrange('leaderboard', 0, 9, 'WITHSCORES');
console.log('leaderboard:', top);
assert.deepEqual(top, ['bob', '1720', 'alice', '1500', 'carol', '1290']);
assert.equal(await redis.zrevrank('leaderboard', 'alice'), 1);

await close();
redis.disconnect();
console.log('OK');
