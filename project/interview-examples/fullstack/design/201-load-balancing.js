// Topic 201: Load Balancing  (Full-Stack Handbook, Part 10)
// Run: npm run ex 201        (or: node 201-load-balancing.js)
// What it shows: an in-process L7 load balancer in front of three real Express servers (one slow).
// Round robin spreads requests evenly regardless of load; least-connections steers away from the slow
// one. A health checker polling /health takes a failing server out of rotation and back in.
import assert from 'node:assert/strict';
import express from 'express';
import { listen, sleep } from './lib.js';

async function startBackend(name, delayMs) {
  const state = { name, healthy: true };
  const app = express();
  app.get('/health', (req, res) => (state.healthy ? res.json({ status: 'ok' }) : res.status(503).json({ status: 'down' })));
  app.get('/work', async (req, res) => { await sleep(delayMs); res.json({ served_by: name }); });
  const srv = await listen(app);
  return { ...srv, state, name, inFlight: 0, up: true };
}

class LoadBalancer {
  constructor(backends, algorithm) { this.backends = backends; this.algorithm = algorithm; this.rr = 0; }
  pick() {
    const live = this.backends.filter((b) => b.up);
    if (!live.length) throw new Error('503: no healthy backends');
    if (this.algorithm === 'round-robin') return live[this.rr++ % live.length];
    return live.reduce((best, b) => (b.inFlight < best.inFlight ? b : best)); // least connections
  }
  async handle(path) {
    const b = this.pick();
    b.inFlight++;
    try { return await (await fetch(b.url + path)).json(); } finally { b.inFlight--; }
  }
  async healthCheck() {
    await Promise.all(this.backends.map(async (b) => {
      try { b.up = (await fetch(`${b.url}/health`, { signal: AbortSignal.timeout(500) })).ok; } catch { b.up = false; }
    }));
  }
}

const backends = [await startBackend('fast-1', 5), await startBackend('fast-2', 5), await startBackend('slow-3', 150)];

// 30 requests arriving every 10 ms, each counted by who served it.
async function traffic(lb, n = 30) {
  const counts = {};
  const pending = [];
  const t0 = performance.now();
  for (let i = 0; i < n; i++) {
    pending.push(lb.handle('/work').then((r) => (counts[r.served_by] = (counts[r.served_by] ?? 0) + 1)));
    await sleep(10);
  }
  await Promise.all(pending);
  return { counts, ms: Math.round(performance.now() - t0) };
}

const rr = await traffic(new LoadBalancer(backends, 'round-robin'));
console.log('round robin       :', rr.counts, `${rr.ms} ms`);
const lc = await traffic(new LoadBalancer(backends, 'least-connections'));
console.log('least connections :', lc.counts, `${lc.ms} ms`);
assert.equal(rr.counts['slow-3'], 10, 'round robin gives the slow server its full third');
assert.ok(lc.counts['slow-3'] < rr.counts['slow-3'], 'least connections sends less to the slow server');

// Health checks: fast-2 starts failing /health and is removed; when it recovers it comes back.
const lb = new LoadBalancer(backends, 'round-robin');
backends[1].state.healthy = false;
await lb.healthCheck();
console.log('after health check:', backends.map((b) => `${b.name}=${b.up ? 'up' : 'OUT'}`).join(' '));
const servedBy = new Set();
for (let i = 0; i < 6; i++) servedBy.add((await lb.handle('/work')).served_by);
assert.deepEqual([...servedBy].sort(), ['fast-1', 'slow-3']);

backends[1].state.healthy = true;
await lb.healthCheck();
assert.ok(backends[1].up);
console.log('recovered         :', backends.map((b) => `${b.name}=${b.up ? 'up' : 'OUT'}`).join(' '));

// A backend that is gone entirely (process crashed) fails the check too.
await backends[2].close();
await lb.healthCheck();
assert.equal(backends[2].up, false);
console.log('crashed slow-3    : removed');

await backends[0].close(); await backends[1].close();
console.log('OK: least-connections adapts to slow servers; health checks remove bad ones');
