// Topic 127: Design: Rate Limiter  (Full-Stack Handbook, Part 6)
// Run: npm run ex 127        (or: node 127-rate-limiter.js)
// What it shows: the handbook's sliding-window limiter on a Redis sorted set (5 req / 1 s here),
// shared by two app instances; then why a fixed window lets a 2x burst through at the edge.
// ioredis-mock stands in for Redis; both "servers" talk to the same in-memory data.
import assert from 'node:assert/strict';
import express from 'express';
import Redis from 'ioredis-mock';
import { serve } from './lib/serve.js';

const LIMIT = 5, WINDOW_MS = 1000; // the handbook uses 100 per 60 s

function makeLimiter(redis) {
  return async function rateLimit(req, res, next) {
    const key = `rl:${req.get('x-user') || req.ip}`;
    const now = Date.now();
    const [, , [, count]] = await redis.multi()
      .zremrangebyscore(key, 0, now - WINDOW_MS)     // drop entries older than the window
      .zadd(key, now, `${now}-${Math.random()}`)     // add this request
      .zcard(key)                                    // count in window
      .pexpire(key, WINDOW_MS)
      .exec();
    res.set('X-RateLimit-Limit', LIMIT);
    res.set('X-RateLimit-Remaining', Math.max(0, LIMIT - count));
    if (count > LIMIT) return res.status(429).json({ error: 'Too many requests, try again shortly' });
    next();
  };
}

// Two servers behind a load balancer, one shared Redis
const makeApp = (name) => {
  const app = express();
  app.use(makeLimiter(new Redis()));
  app.get('/api', (req, res) => res.json({ server: name }));
  return app;
};
const A = await serve(makeApp('A'));
const B = await serve(makeApp('B'));

const hit = async (base, user) => {
  const r = await fetch(base + '/api', { headers: { 'x-user': user } });
  return { status: r.status, remaining: r.headers.get('x-ratelimit-remaining') };
};

// alice alternates between servers: the count is shared, so request 6 is rejected
const seen = [];
for (let i = 0; i < 7; i++) seen.push(await hit(i % 2 ? B.url : A.url, 'alice'));
console.log('alice A/B alternating:', seen.map((s) => `${s.status}(${s.remaining})`).join(' '));
assert.deepEqual(seen.map((s) => s.status), [200, 200, 200, 200, 200, 429, 429]);
assert.equal(seen[4].remaining, '0');

// bob has his own budget
assert.equal((await hit(A.url, 'bob')).status, 200);

// after the window slides past, alice is allowed again
await new Promise((r) => setTimeout(r, WINDOW_MS + 50));
const after = await hit(A.url, 'alice');
console.log('alice after the window:', after.status);
assert.equal(after.status, 200);
await A.close(); await B.close();

// --- Fixed window vs sliding log with a fake clock: 5 requests at t=990ms and 5 at t=1010ms ---
function fixedWindow() {
  const counts = new Map();
  return (t) => { const w = Math.floor(t / WINDOW_MS); counts.set(w, (counts.get(w) ?? 0) + 1); return counts.get(w) <= LIMIT; };
}
function slidingLog() {
  const log = [];
  return (t) => { while (log.length && log[0] <= t - WINDOW_MS) log.shift(); log.push(t); return log.length <= LIMIT; };
}
function tokenBucket(capacity = LIMIT, refillPerMs = LIMIT / WINDOW_MS) {
  let tokens = capacity, last = 0;
  return (t) => { tokens = Math.min(capacity, tokens + (t - last) * refillPerMs); last = t; if (tokens < 1) return false; tokens--; return true; };
}
const burst = [...Array(5).fill(990), ...Array(5).fill(1010)];
const allowed = (limiter) => burst.filter((t) => limiter(t)).length;
const results = { fixed: allowed(fixedWindow()), sliding: allowed(slidingLog()), tokenBucket: allowed(tokenBucket()) };
console.log('allowed out of 10 requests within 20 ms around a window edge:', results);
assert.equal(results.fixed, 10, 'fixed window: 2x the limit slips through at the boundary');
assert.equal(results.sliding, 5);
assert.equal(results.tokenBucket, 5);
console.log('OK');
