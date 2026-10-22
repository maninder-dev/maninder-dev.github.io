// Topic 219: Node.js Questions - a production-ready Express API  (Full-Stack Handbook, Part 11)
// Run: npm run ex 219        (or: node 219-production-ready-express.js)
// What it shows: helmet, a CORS allow list with credentials, a 1 MB body limit (413), rate
// limiting (429), structured JSON logs, a health check and a central error handler, all asserted.
// A tiny JSON logger stands in for pino-http; graceful shutdown is shown in 125-graceful-shutdown.js.
import assert from 'node:assert/strict';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { serve } from './lib/serve.js';

const FRONTEND_URL = 'https://app.example.com';
const logs = [];
const jsonLogger = (req, res, next) => {
  const start = performance.now();
  res.on('finish', () => logs.push({ level: 'info', method: req.method, url: req.originalUrl, status: res.statusCode, ms: Math.round(performance.now() - start) }));
  next();
};
const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) logs.push({ level: 'error', msg: err.message });
  res.status(status).json({ error: status >= 500 ? 'Something went wrong' : err.message });
};

const routes = express.Router();
routes.post('/orders', (req, res) => res.status(201).json({ received: Object.keys(req.body).length }));
routes.get('/boom', () => { throw new Error('pool exhausted'); });

const app = express();
app.use(helmet());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(jsonLogger);
app.use('/api', rateLimit({ windowMs: 60_000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);
app.use(errorHandler);

const { url, close } = await serve(app);
const post = (body) => fetch(url + '/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: FRONTEND_URL }, body });

const ok = await post(JSON.stringify({ item: 'desk' }));
console.log('POST /api/orders ->', ok.status, '| CORS:', ok.headers.get('access-control-allow-origin'), 'credentials:', ok.headers.get('access-control-allow-credentials'));
assert.equal(ok.status, 201);
assert.equal(ok.headers.get('access-control-allow-origin'), FRONTEND_URL);
assert.equal(ok.headers.get('access-control-allow-credentials'), 'true');
assert.equal(ok.headers.get('x-frame-options'), 'SAMEORIGIN', 'helmet');
assert.equal(ok.headers.get('x-powered-by'), null, 'helmet hides Express');

const huge = await post(JSON.stringify({ blob: 'x'.repeat(1.1e6) }));
console.log('POST 1.1 MB body ->', huge.status, await huge.json());
assert.equal(huge.status, 413);

const boom = await fetch(url + '/api/boom');
assert.deepEqual([boom.status, await boom.json()], [500, { error: 'Something went wrong' }]);

const statuses = [];
for (let i = 0; i < 4; i++) statuses.push((await fetch(url + '/api/boom')).status);
console.log('more /api calls ->', statuses.join(' '), '(limit 5 per minute)');
assert.deepEqual(statuses, [500, 500, 500, 429]); // the 413 never reached the limiter: json() runs first

const health = await fetch(url + '/health');
assert.deepEqual([health.status, await health.json()], [200, { status: 'ok' }]);
console.log('GET /health -> 200 (not rate limited)');

console.log('structured logs:', logs.slice(0, 2).map((l) => JSON.stringify(l)).join('\n                 '));
assert.ok(logs.some((l) => l.level === 'error' && l.msg === 'pool exhausted'));
assert.ok(logs.some((l) => l.status === 429));
await close();
console.log('OK');
