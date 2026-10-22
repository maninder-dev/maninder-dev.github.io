// Topic 203: Observability: Logs, Metrics, Traces  (Full-Stack Handbook, Part 10)
// Run: npm run ex 203        (or: node 203-observability.js)
// What it shows: structured JSON logs (pino) carrying a request ID, latency percentiles p50/p95/p99 from
// recorded durations, a trace ID propagated across two services, and an error-rate alert rule.
// (Metrics and tracing are hand-rolled here in place of Prometheus and OpenTelemetry.)
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';
import express from 'express';
import pino from 'pino';
import { listen, sleep } from './lib.js';

// Capture log lines in memory instead of stdout so we can assert on them.
const lines = [];
const sink = new Writable({ write(chunk, _enc, cb) { lines.push(JSON.parse(chunk)); cb(); } });
const logger = pino({ base: undefined, timestamp: false }, sink);

const durations = [];
const statusCounts = { ok: 0, error: 0 };

// Middleware: request ID (reuse the caller's), child logger, timing + metrics.
function observe(service) {
  return (req, res, next) => {
    req.id = req.get('x-request-id') ?? randomUUID();
    res.set('x-request-id', req.id);
    req.log = logger.child({ service, reqId: req.id });
    const t0 = performance.now();
    res.on('finish', () => {
      const ms = performance.now() - t0;
      if (service === 'api') { durations.push(ms); statusCounts[res.statusCode >= 500 ? 'error' : 'ok']++; }
      req.log.info({ method: req.method, url: req.url, status: res.statusCode, ms: Math.round(ms) }, 'request completed');
    });
    next();
  };
}

// Downstream service
const pricing = express();
pricing.use(observe('pricing'));
pricing.get('/price/:id', (req, res) => { req.log.info({ productId: req.params.id }, 'pricing lookup'); res.json({ price: 499 }); });
const pricingSrv = await listen(pricing);

// Edge API: calls pricing and forwards the same ID, so one ID ties the whole request together
let n = 0;
const api = express();
api.use(observe('api'));
api.get('/api/products/:id', async (req, res) => {
  n++;
  await sleep(n % 10 === 0 ? 120 : 2);              // every 10th request is slow
  if (n % 25 === 0) { req.log.error({ err: 'db timeout' }, 'failed'); return res.status(500).json({ error: 'internal' }); }
  const r = await fetch(`${pricingSrv.url}/price/${req.params.id}`, { headers: { 'x-request-id': req.id } });
  res.json({ id: req.params.id, ...(await r.json()) });
});
const apiSrv = await listen(api);

for (let i = 0; i < 50; i++) await fetch(`${apiSrv.url}/api/products/${i}`, { headers: i === 0 ? { 'x-request-id': 'trace-abc' } : {} });

// Logs: structured, searchable by request ID across both services
const traced = lines.filter((l) => l.reqId === 'trace-abc');
console.log('log lines for trace-abc:');
for (const l of traced) console.log('  ', JSON.stringify(l));
assert.deepEqual(new Set(traced.map((l) => l.service)), new Set(['api', 'pricing']));
assert.ok(lines.every((l) => typeof l.reqId === 'string' && l.level >= 30));

// Metrics: averages hide the slow tail, percentiles show it
const pct = (p) => { const s = [...durations].sort((a, b) => a - b); return s[Math.ceil((p / 100) * s.length) - 1]; };
const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
console.log(`latency avg=${avg.toFixed(0)}ms p50=${pct(50).toFixed(0)}ms p95=${pct(95).toFixed(0)}ms p99=${pct(99).toFixed(0)}ms`);
assert.ok(pct(50) < 100, 'the typical request is fast');
assert.ok(pct(95) >= 100, 'p95 exposes the slow 10%');

// Alert rule: page when more than 2% of requests fail (here evaluated once instead of "for: 5m")
const errorRate = statusCounts.error / (statusCounts.ok + statusCounts.error);
const firing = errorRate > 0.02;
console.log(`error rate ${(errorRate * 100).toFixed(1)}% -> HighErrorRate ${firing ? 'FIRING' : 'ok'}`);
assert.equal(statusCounts.error, 2);
assert.equal(firing, true);
assert.equal(lines.filter((l) => l.level === 50).length, 2, 'errors logged at level 50 (error)');

await apiSrv.close(); await pricingSrv.close();
console.log('OK: one request ID across services, tail latency visible, alert fires on symptoms');
