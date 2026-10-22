// Topic 114: Middleware: The Assembly Line  (Full-Stack Handbook, Part 6)
// Run: npm run ex 114        (or: node 114-middleware.js)
// What it shows: a logger that measures each request on 'finish', a route-level auth guard,
// and router-level middleware protecting everything under /admin.
import assert from 'node:assert/strict';
import express from 'express';
import { serve } from './lib/serve.js';

const app = express();
const logLines = [];

// Logger: runs for every request, records after the response is sent
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`;
    logLines.push(line);
    console.log('  log:', line);
  });
  next();
});

// Auth guard: ends the response early, or passes control on
function requireAuth(req, res, next) {
  if (!req.headers.authorization) return res.status(401).json({ error: 'Login required' });
  next();
}
app.get('/api/public', (req, res) => res.json({ ok: 'anyone' }));
app.get('/api/profile', requireAuth, (req, res) => res.json({ ok: true }));

// Router-level middleware: every /admin route is guarded
const admin = express.Router();
admin.use(requireAuth);
admin.use((req, res, next) => { req.adminSeenAt = 'router'; next(); }); // middleware can add to req
admin.get('/stats', (req, res) => res.json({ users: 42, via: req.adminSeenAt }));
app.use('/admin', admin);

const { url, close } = await serve(app);
const auth = { headers: { Authorization: 'Bearer demo' } };
const get = async (path, init) => { const r = await fetch(url + path, init); return [r.status, await r.json()]; };

assert.deepEqual(await get('/api/public'), [200, { ok: 'anyone' }]);
assert.deepEqual(await get('/api/profile'), [401, { error: 'Login required' }]);
assert.deepEqual(await get('/api/profile', auth), [200, { ok: true }]);
assert.deepEqual(await get('/admin/stats'), [401, { error: 'Login required' }]);
assert.deepEqual(await get('/admin/stats', auth), [200, { users: 42, via: 'router' }]);

assert.equal(logLines.length, 5, 'logger saw every request, including rejected ones');
assert.match(logLines[1], /^GET \/api\/profile 401 \d+ms$/);

await close();
console.log('OK');
