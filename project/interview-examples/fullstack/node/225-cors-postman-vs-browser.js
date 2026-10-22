// Topic 225: Debugging - works in Postman, fails in the browser  (Full-Stack Handbook, Part 11)
// Run: npm run ex 225        (or: node 225-cors-postman-vs-browser.js)
// What it shows: a server-to-server call (like Postman) succeeds without CORS, but the browser's
// preflight gets no Access-Control-Allow-* headers, so the browser would block the call. With
// cors({ origin, credentials: true }) the preflight passes for the allowed origin only.
// We send the preflight by hand, exactly like the handbook's curl -X OPTIONS check.
import assert from 'node:assert/strict';
import cors from 'cors';
import express from 'express';
import { serve } from './lib/serve.js';

const APP = 'https://app.example.com';
const make = (withCors) => {
  const app = express();
  if (withCors) app.use(cors({ origin: APP, credentials: true }));
  app.use(express.json());
  app.post('/orders', (req, res) => res.status(201).json({ ok: true }));
  return app;
};
const preflight = (url, origin) => fetch(url + '/orders', {
  method: 'OPTIONS',
  headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
});
// What a browser checks before sending the real POST with credentials
const browserWouldAllow = (r, origin) =>
  r.ok && r.headers.get('access-control-allow-origin') === origin &&
  r.headers.get('access-control-allow-credentials') === 'true' &&
  (r.headers.get('access-control-allow-methods') ?? '').includes('POST');

// BUG: no CORS middleware
const bad = await serve(make(false));
const postman = await fetch(bad.url + '/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
const pf1 = await preflight(bad.url, APP);
console.log(`BUG  "Postman" POST -> ${postman.status}; browser preflight -> ${pf1.status}, Allow-Origin: ${pf1.headers.get('access-control-allow-origin')}`);
assert.equal(postman.status, 201, 'no browser, no CORS check');
assert.equal(browserWouldAllow(pf1, APP), false, 'blocked by CORS policy');
await bad.close();

// FIX: allow the origin + credentials
const good = await serve(make(true));
const pf2 = await preflight(good.url, APP);
console.log(`FIX  preflight from ${APP} -> ${pf2.status}`,
  Object.fromEntries([...pf2.headers].filter(([k]) => k.startsWith('access-control'))));
assert.equal(pf2.status, 204);
assert.equal(browserWouldAllow(pf2, APP), true);

const evil = await preflight(good.url, 'https://evil.example');
console.log('FIX  preflight from https://evil.example -> Allow-Origin:', evil.headers.get('access-control-allow-origin'), '(not the caller, so the browser blocks it)');
assert.equal(browserWouldAllow(evil, 'https://evil.example'), false, 'other origins still blocked');

// Client side: fetch(url, { method: 'POST', credentials: 'include' }) so cookies are sent
await good.close();
console.log('OK');
