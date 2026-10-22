// Topic 191: How to Approach a System Design Interview  (Full-Stack Handbook, Part 10)
// Run: npm run ex 191        (or: node 191-capacity-estimate.js)
// What it shows: the back-of-envelope step as code - users -> req/s -> peak writes -> storage,
// and how those numbers decide "one Postgres primary + replicas + cache" vs "shard now".
import assert from 'node:assert/strict';

function estimate({ dailyUsers, requestsPerUser, peakFactor, writeShare, bytesPerWrite, days }) {
  const perDay = dailyUsers * requestsPerUser;
  const avgRps = perDay / 86_400;
  const peakRps = avgRps * peakFactor;
  const peakWrites = peakRps * writeShare;
  const storageBytes = perDay * writeShare * bytesPerWrite * days;
  return { perDay, avgRps, peakRps, peakWrites, storageGB: storageBytes / 1e9 };
}

// Rough single-node limits used in interviews (order of magnitude, not benchmarks).
const LIMITS = { postgresWritesPerSec: 5_000, postgresReadsPerSec: 20_000, appServerRps: 2_000 };

function recommend(e) {
  const appServers = Math.ceil(e.peakRps / LIMITS.appServerRps) + 1; // +1 spare for failures/deploys
  const reads = e.peakRps - e.peakWrites;
  const plan = [];
  plan.push(`${appServers} stateless app servers behind a load balancer`);
  if (e.peakWrites < LIMITS.postgresWritesPerSec) plan.push('one PostgreSQL primary for writes');
  else plan.push('writes exceed one primary: partition/shard the hottest tables');
  if (reads > LIMITS.postgresReadsPerSec) plan.push('Redis cache + read replicas for reads');
  else plan.push('read replicas optional; add a cache for hot keys');
  return { appServers, plan };
}

// The handbook's example: 10M daily users x 20 requests, 5x peak, 10% writes.
const e = estimate({ dailyUsers: 10e6, requestsPerUser: 20, peakFactor: 5, writeShare: 0.1, bytesPerWrite: 1_000, days: 365 });
console.log('requests/day   :', e.perDay.toLocaleString());
console.log('avg req/s      :', Math.round(e.avgRps));
console.log('peak req/s     :', Math.round(e.peakRps));
console.log('peak writes/s  :', Math.round(e.peakWrites));
console.log('storage/year GB:', Math.round(e.storageGB));

assert.equal(e.perDay, 200_000_000);
assert.ok(Math.abs(e.avgRps - 2_315) < 1, '~2,300 req/s average');
assert.ok(Math.abs(e.peakRps - 11_574) < 1, '~12,000 req/s at peak');
assert.ok(Math.abs(e.peakWrites - 1_157) < 1, '~1,200 writes/s at peak');
assert.equal(Math.round(e.storageGB), 7_300); // 20M writes/day * 1 KB * 365

const r = recommend(e);
console.log('plan:', r.plan.join('; '));
assert.equal(r.appServers, 7);
assert.ok(r.plan.includes('one PostgreSQL primary for writes'), 'one primary is plausible, as the handbook says');

// Ten times bigger and the same arithmetic tells you writes no longer fit one primary.
const big = recommend(estimate({ dailyUsers: 100e6, requestsPerUser: 20, peakFactor: 5, writeShare: 0.1, bytesPerWrite: 1_000, days: 365 }));
console.log('100M users plan:', big.plan.join('; '));
assert.ok(big.plan.some((p) => p.includes('shard')));

// The six steps, in interview order (a checklist you can say out loud).
const steps = ['clarify requirements', 'estimate', 'API design', 'data model', 'high-level design', 'deep dives'];
assert.equal(steps.length, 6);
console.log('OK: estimates match the handbook and drive the design choice');
