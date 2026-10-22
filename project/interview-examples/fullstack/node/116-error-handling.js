// Topic 116: Error-Handling Middleware  (Full-Stack Handbook, Part 6)
// Run: npm run ex 116        (or: node 116-error-handling.js)
// What it shows: a 4-argument error handler, AppError with a status, Express 5 catching rejected
// promises on its own, the Express 4 asyncHandler wrapper, and not leaking internals on 500s.
import assert from 'node:assert/strict';
import express from 'express';
import { serve } from './lib/serve.js';

class AppError extends Error {
  constructor(message, status = 500) { super(message); this.status = status; }
}

// Express 4 helper for async routes (harmless, but no longer needed in Express 5)
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const orders = new Map([['1', { id: 1, total: 499 }]]);
const Order = { findByPk: async (id) => orders.get(id) ?? null };
const logged = [];
const logger = { error: (e) => logged.push(e.message) };

const app = express();
app.get('/api/orders/:id', asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  res.json(order);
}));
// Express 5: an async handler that rejects reaches the error handler with no wrapper
app.get('/api/v5/orders/:id', async (req, res) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  res.json(order);
});
app.get('/api/crash', async () => { throw new Error('connect ECONNREFUSED 10.0.0.5:5432'); });
app.get('/api/next', (req, res, next) => next(new AppError('Bad input', 400)));

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) logger.error(err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong' : err.message }); // don't leak internals
});

const { url, close } = await serve(app);
const get = async (p) => { const r = await fetch(url + p); const b = await r.json(); console.log(p, '->', r.status, JSON.stringify(b)); return [r.status, b]; };

assert.deepEqual(await get('/api/orders/1'), [200, { id: 1, total: 499 }]);
assert.deepEqual(await get('/api/orders/2'), [404, { error: 'Order not found' }]);
assert.deepEqual(await get('/api/v5/orders/2'), [404, { error: 'Order not found' }]);
assert.deepEqual(await get('/api/next'), [400, { error: 'Bad input' }]);
assert.deepEqual(await get('/api/crash'), [500, { error: 'Something went wrong' }]);
assert.deepEqual(logged, ['connect ECONNREFUSED 10.0.0.5:5432'], 'the real cause is logged, not sent');
await close();

// Last line of defence for promises nobody handled. The handbook exits(1) here; we just record it.
const unhandled = await new Promise((resolve) => {
  process.once('unhandledRejection', (e) => resolve(e.message)); // real app: logger.fatal(e); process.exit(1)
  Promise.reject(new Error('forgot to await'));
});
console.log('unhandledRejection caught:', unhandled);
assert.equal(unhandled, 'forgot to await');
console.log('OK');
