// Topic 126: Design: URL Shortener (like bit.ly)  (Full-Stack Handbook, Part 6)
// Run: npm run ex 126        (or: node 126-url-shortener.js)
// What it shows: base62 codes from an auto-increment id (+ offset), http(s)-only validation,
// 302 redirects with a Redis read-through cache, and click events queued then aggregated async.
// Simulated: an in-memory table stands in for the links table, ioredis-mock for Redis, and an
// array for the job queue (BullMQ/SQS in production).
import assert from 'node:assert/strict';
import express from 'express';
import Redis from 'ioredis-mock';
import { z } from 'zod';
import { serve } from './lib/serve.js';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const toBase62 = (n) => {
  let s = '';
  do { s = ALPHABET[n % 62] + s; n = Math.floor(n / 62); } while (n > 0);
  return s;
};
assert.equal(toBase62(0), '0');
assert.equal(toBase62(61), 'Z');
assert.equal(toBase62(62), '10');
console.log('62^7 =', (62 ** 7).toLocaleString('en-US'), 'possible 7-char codes');
assert.ok(62 ** 7 > 3.5e12);

// --- storage, cache, queue ---
const links = [];      // { id, code, longUrl, createdAt }
let dbReads = 0;
const Link = {
  create: async ({ longUrl }) => { const row = { id: links.length + 1, longUrl, createdAt: new Date() }; links.push(row); return row; },
  findOne: async (code) => { dbReads++; return links.find((l) => l.code === code) ?? null; },
};
const redis = new Redis();
const queue = { jobs: [], add(name, data) { this.jobs.push({ name, data }); } };

const shortenBody = z.object({
  url: z.url({ protocol: /^https?$/ }).max(2048), // reject javascript:, data:, ftp: ...
});

const app = express();
app.use(express.json());
app.post('/shorten', async (req, res) => {
  const parsed = shortenBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'A valid http(s) URL is required' });
  const row = await Link.create({ longUrl: parsed.data.url });
  row.code = toBase62(row.id + 100000000); // offset avoids very short, guessable codes
  res.status(201).json({ shortUrl: `https://sho.rt/${row.code}`, code: row.code });
});
app.get('/:code', async (req, res) => {
  let url = await redis.get(`link:${req.params.code}`);
  if (!url) {
    const link = await Link.findOne(req.params.code);
    if (!link) return res.status(404).send('Link not found');
    url = link.longUrl;
    await redis.set(`link:${req.params.code}`, url, 'EX', 86400);
  }
  queue.add('click', { code: req.params.code, at: Date.now(), ua: req.get('user-agent') });
  res.redirect(302, url); // 302 so every click reaches us (analytics); 301 would be cached by browsers
});

const { url, close } = await serve(app);
const shorten = async (longUrl) => {
  const r = await fetch(url + '/shorten', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: longUrl }) });
  return [r.status, await r.json()];
};

const [status, body] = await shorten('https://example.com/a/very/long/path?with=query');
console.log('POST /shorten ->', status, body.shortUrl);
assert.equal(status, 201);
assert.equal(body.code, toBase62(100000001));
assert.equal(body.code.length, 5);

for (const bad of ['javascript:alert(1)', 'ftp://example.com/x', 'not a url']) {
  const [s] = await shorten(bad);
  console.log(`POST /shorten ${JSON.stringify(bad)} -> ${s}`);
  assert.equal(s, 400);
}

for (let i = 1; i <= 3; i++) {
  const r = await fetch(`${url}/${body.code}`, { redirect: 'manual', headers: { 'User-Agent': `client-${i}` } });
  console.log(`GET /${body.code} #${i} -> ${r.status} Location: ${r.headers.get('location')}`);
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), 'https://example.com/a/very/long/path?with=query');
}
assert.equal(dbReads, 1, 'only the first redirect hit the database; the rest came from Redis');
assert.equal((await fetch(url + '/nope123', { redirect: 'manual' })).status, 404);

// Analytics worker: drains the queue and aggregates, off the redirect's hot path
const clicks = {};
for (const job of queue.jobs.splice(0)) clicks[job.data.code] = (clicks[job.data.code] ?? 0) + 1;
console.log('aggregated clicks:', clicks);
assert.deepEqual(clicks, { [body.code]: 3 });

await close();
redis.disconnect();
console.log('OK');
