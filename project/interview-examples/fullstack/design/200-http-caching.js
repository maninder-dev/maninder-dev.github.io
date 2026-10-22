// Topic 200: Caching at Every Layer  (Full-Stack Handbook, Part 10)
// Run: npm run ex 200        (or: node 200-http-caching.js)
// What it shows: browser-layer caching with Cache-Control + ETag -> 304 Not Modified (no body re-sent),
// immutable hashed assets, and an application-layer cache invalidated with versioned keys.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import express from 'express';
import { listen } from './lib.js';

let categories = [{ id: 1, name: 'Books' }, { id: 2, name: 'Music' }];
let dbReads = 0;

// --- Application cache with versioned keys: bump the version on write, old entries just age out. ---
const appCache = new Map();
let catVersion = 1;
function getCategories() {
  const key = `categories:v${catVersion}`;
  if (!appCache.has(key)) { dbReads++; appCache.set(key, structuredClone(categories)); }
  return appCache.get(key);
}

const app = express();
app.set('etag', false); // we compute the ETag ourselves to show how it works
app.get('/api/categories', (req, res) => {
  const data = getCategories();
  const body = JSON.stringify(data);
  const etag = `"${createHash('sha1').update(body).digest('base64url')}"`;
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
  res.set('ETag', etag);
  if (req.get('If-None-Match') === etag) return res.status(304).end(); // client copy is still good
  res.type('json').send(body);
});
app.put('/api/categories/:id', express.json(), (req, res) => {
  categories = categories.map((c) => (c.id === Number(req.params.id) ? { ...c, ...req.body } : c));
  catVersion++; // invalidate: new key, the next read misses
  res.sendStatus(204);
});
// Hashed filenames never change content, so they can be cached for a year.
app.get('/static/app.3f9a1c.js', (req, res) => {
  res.set('Cache-Control', 'public, max-age=31536000, immutable').type('js').send('console.log(1)');
});
const { url, close } = await listen(app);

// First visit: full response
let r = await fetch(`${url}/api/categories`);
const etag = r.headers.get('etag');
const firstBody = await r.text();
console.log('1st GET  :', r.status, `${firstBody.length} bytes`, 'ETag', etag, '|', r.headers.get('cache-control'));
assert.equal(r.status, 200);
assert.match(r.headers.get('cache-control'), /max-age=300/);

// Revalidation after max-age: send the ETag back, get 304 with no body
r = await fetch(`${url}/api/categories`, { headers: { 'If-None-Match': etag } });
const body304 = await r.text();
console.log('revalidate:', r.status, `${body304.length} bytes`);
assert.equal(r.status, 304);
assert.equal(body304, '');
assert.equal(dbReads, 1, 'second request served from the app cache, not the DB');

// A write changes the data: the old ETag no longer matches, client gets the new version
await fetch(`${url}/api/categories/2`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{"name":"Vinyl"}' });
r = await fetch(`${url}/api/categories`, { headers: { 'If-None-Match': etag } });
const fresh = await r.json();
console.log('after PUT :', r.status, fresh.map((c) => c.name).join(', '), '| new ETag', r.headers.get('etag'));
assert.equal(r.status, 200);
assert.equal(fresh[1].name, 'Vinyl');
assert.notEqual(r.headers.get('etag'), etag);
assert.equal(dbReads, 2, 'versioned key forced exactly one fresh DB read');

r = await fetch(`${url}/static/app.3f9a1c.js`);
assert.equal(r.headers.get('cache-control'), 'public, max-age=31536000, immutable');
console.log('static    :', r.headers.get('cache-control'));

await close();
console.log('OK: 304 saves the body, versioned keys make invalidation a one-liner');
