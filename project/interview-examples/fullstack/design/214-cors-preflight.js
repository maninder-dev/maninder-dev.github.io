// Topic 214: HTTP, REST and APIs - CORS and the preflight  (Full-Stack Handbook, Part 11)
// Run: npm run ex 214        (or: node 214-cors-preflight.js)
// What it shows: a real Express API with the cors middleware, and the exact OPTIONS preflight a browser
// sends for a non-simple request (PATCH with JSON + credentials). We play the browser: send the preflight,
// read the Access-Control-* headers and decide whether the real request would be allowed.
import assert from 'node:assert/strict';
import express from 'express';
import cors from 'cors';
import { listen } from './lib.js';

const app = express();
app.use(cors({
  origin: ['https://app.example.com'],
  credentials: true,                                  // allow cookies
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,                                        // browser may cache the preflight for 10 minutes
}));
app.use(express.json());
let patched = 0;
app.patch('/me', (req, res) => { patched++; res.json({ ok: true }); });
const { url, close } = await listen(app);

// What the browser does before a cross-origin PATCH with a JSON body:
async function preflight(origin, method, headers = 'content-type') {
  const r = await fetch(`${url}/me`, {
    method: 'OPTIONS',
    headers: { Origin: origin, 'Access-Control-Request-Method': method, 'Access-Control-Request-Headers': headers },
  });
  const h = (k) => r.headers.get(k);
  const allowed = h('access-control-allow-origin') === origin
    && (h('access-control-allow-methods') ?? '').split(',').includes(method)
    && headers.split(',').every((x) => (h('access-control-allow-headers') ?? '').toLowerCase().split(',').includes(x.trim().toLowerCase()))
    && h('access-control-allow-credentials') === 'true';
  return { status: r.status, allowed, headers: Object.fromEntries([...r.headers].filter(([k]) => k.startsWith('access-control'))) };
}

let p = await preflight('https://app.example.com', 'PATCH');
console.log('preflight from app.example.com:', p.status, p.headers);
assert.equal(p.status, 204);
assert.equal(p.allowed, true);
assert.equal(p.headers['access-control-max-age'], '600');
assert.equal(patched, 0, 'the preflight never reaches the route handler');

p = await preflight('https://evil.example', 'PATCH');
console.log('preflight from evil.example   :', p.status, 'Allow-Origin =', p.headers['access-control-allow-origin'] ?? '(missing)', '-> browser blocks');
assert.equal(p.allowed, false);

p = await preflight('https://app.example.com', 'PUT');
console.log('preflight for PUT             : allowed =', p.allowed, '(PUT not in methods)');
assert.equal(p.allowed, false);

p = await preflight('https://app.example.com', 'PATCH', 'content-type,x-debug');
console.log('preflight with X-Debug header : allowed =', p.allowed);
assert.equal(p.allowed, false);

// The actual request (sent only after a successful preflight)
const r = await fetch(`${url}/me`, { method: 'PATCH', headers: { Origin: 'https://app.example.com', 'content-type': 'application/json' }, body: '{}' });
assert.equal(r.headers.get('access-control-allow-origin'), 'https://app.example.com');
assert.equal(r.headers.get('vary'), 'Origin', 'caches must not reuse a response across origins');
console.log('actual PATCH                  :', r.status, 'Allow-Origin', r.headers.get('access-control-allow-origin'), 'Vary', r.headers.get('vary'));

// Note: CORS is enforced by browsers only. Without an Origin header (curl, Postman, servers) the
// request simply goes through - CORS is not an access-control mechanism for your API.
const noOrigin = await fetch(`${url}/me`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: '{}' });
assert.equal(noOrigin.status, 200);
assert.equal(patched, 2);
console.log('no Origin (curl/Postman)      :', noOrigin.status, '-> works, which is why "it works in Postman"');

// Why `origin: '*'` cannot be combined with cookies: browsers reject credentials with a wildcard.
const wildcardOk = (allowOrigin, withCredentials) => !(withCredentials && allowOrigin === '*');
assert.equal(wildcardOk('*', true), false);

await close();
console.log('OK: preflight allowed only for the listed origin, method and headers');
