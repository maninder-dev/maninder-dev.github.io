// Topic 115: Middleware Order Matters  (Full-Stack Handbook, Part 6)
// Run: npm run ex 115        (or: node 115-middleware-order.js)
// What it shows: BUG - express.json() registered after the routes leaves req.body undefined, and an
// error handler registered before the routes never runs. FIX - the recommended order, end to end.
import assert from 'node:assert/strict';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { serve } from './lib/serve.js';

const routes = express.Router();
routes.post('/echo', (req, res) => res.json({ body: req.body ?? null }));
routes.get('/fail', () => { throw new Error('db down'); });
const errorHandler = (err, req, res, next) => res.status(500).json({ error: 'Something went wrong' });

// ---- BUG: wrong order ----
const bad = express();
bad.set('env', 'test');          // only silences Express's default stderr logging for this demo
bad.use(errorHandler);           // too early: errors thrown later never reach it
bad.use('/api', routes);
bad.use(express.json());         // too late: routes already ran without a parsed body

// ---- FIX: security headers, CORS, body parsing, logging, rate limit, routes, 404, errors ----
const good = express();
let hits = 0;
const rateLimiter = (req, res, next) => (++hits > 100 ? res.status(429).end() : next());
good.use(helmet());
good.use(cors({ origin: 'https://app.example.com' }));
good.use(express.json({ limit: '1mb' }));
good.use((req, res, next) => next());                        // logging would go here (morgan/pino)
good.use('/api', rateLimiter);
good.use('/api', routes);
good.use((req, res) => res.status(404).json({ error: 'Not found' }));
good.use(errorHandler);                                       // LAST

const post = (url) => fetch(url + '/api/echo', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://app.example.com' },
  body: JSON.stringify({ name: 'Ada' }),
});

const B = await serve(bad);
const badEcho = await (await post(B.url)).json();
const badFail = await fetch(B.url + '/api/fail');
const badFailText = await badFail.text();
console.log('BUG  /echo body ->', JSON.stringify(badEcho));
console.log('BUG  /fail ->', badFail.status, badFail.headers.get('content-type'), '(Express default HTML page)');
assert.deepEqual(badEcho, { body: null }, 'req.body was undefined');
assert.equal(badFail.status, 500);
assert.match(badFail.headers.get('content-type'), /text\/html/, 'our JSON error handler never ran');
assert.match(badFailText, /db down/, 'default handler outside production leaks the stack');
await B.close();

const G = await serve(good);
const res = await post(G.url);
const goodEcho = await res.json();
console.log('FIX  /echo body ->', JSON.stringify(goodEcho));
assert.deepEqual(goodEcho, { body: { name: 'Ada' } });
assert.equal(res.headers.get('x-content-type-options'), 'nosniff', 'helmet header present');
assert.equal(res.headers.get('access-control-allow-origin'), 'https://app.example.com');

const fail = await fetch(G.url + '/api/fail');
assert.deepEqual([fail.status, await fail.json()], [500, { error: 'Something went wrong' }]);
const missing = await fetch(G.url + '/nope');
assert.deepEqual([missing.status, await missing.json()], [404, { error: 'Not found' }]);
console.log('FIX  /fail -> 500 JSON, /nope -> 404 JSON, helmet + CORS headers set');
await G.close();
console.log('OK');
