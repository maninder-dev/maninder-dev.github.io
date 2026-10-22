// Topic 219: Node.js Questions - finding a memory leak  (Full-Stack Handbook, Part 11)
// Run: npm run ex 219        (or: node 219-memory-leak-lru.js)
// What it shows: BUG - a global cache gets one entry per unique URL and grows forever.
// FIX - a bounded LRUCache (max 500, ttl 60 s). Heap is measured after a forced GC each time.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import v8 from 'node:v8';
import vm from 'node:vm';
import express from 'express';
import { LRUCache } from 'lru-cache';
import { serve } from './lib/serve.js';

// Enable global.gc() at runtime so heap numbers are stable (same as node --expose-gc)
v8.setFlagsFromString('--expose-gc');
const gc = vm.runInNewContext('gc');
const heapMb = () => { gc(); return process.memoryUsage().heapUsed / 1e6; };

const bigPayload = (url) => ({ url, data: crypto.randomBytes(10_000).toString('hex') }); // 20 KB of unique string each

const leaky = express();
const cache = {};
// Express 5 path syntax: '/{*path}' replaces the handbook's '*'
leaky.get('/{*path}', (req, res) => { cache[req.url] = bigPayload(req.url); res.end(); });

const fixed = express();
const lru = new LRUCache({ max: 500, ttl: 60_000 });
fixed.get('/{*path}', (req, res) => {
  if (!lru.has(req.url)) lru.set(req.url, bigPayload(req.url));
  res.end();
});

async function hammer(app, n) {
  const { url, close } = await serve(app);
  const before = heapMb();
  for (let i = 0; i < n; i += 50) {
    await Promise.all(Array.from({ length: 50 }, (_, j) => fetch(`${url}/item/${i + j}?q=${i + j}`).then((r) => r.text())));
  }
  const grew = heapMb() - before;
  await close();
  return grew;
}

const N = 3000;
const leakGrowth = await hammer(leaky, N);
console.log(`BUG  global object : ${Object.keys(cache).length} entries, heap +${leakGrowth.toFixed(1)} MB`);
const lruGrowth = await hammer(fixed, N);
console.log(`FIX  LRUCache(500) : ${lru.size} entries, heap +${lruGrowth.toFixed(1)} MB`);

assert.equal(Object.keys(cache).length, N, 'one entry per unique URL, never evicted');
assert.equal(lru.size, 500, 'bounded');
assert.ok(leakGrowth > 3 * lruGrowth, 'leak grows the heap far more than the bounded cache');

// The investigation loop from the handbook: watch heapUsed over time, then compare heap
// snapshots (node --inspect -> Chrome DevTools -> Memory, or v8.writeHeapSnapshot()).
console.log('OK');
