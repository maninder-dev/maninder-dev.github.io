// Topic 224: System Design Questions - scaling an API from 1,000 to 1 million users  (Full-Stack Handbook, Part 11)
// Run: npm run ex 224        (or: node 224-scaling-stages.js)
// What it shows: the four stages as a short narrative, each one triggered by a bottleneck that a simple
// capacity model detects. The numbers are illustrative orders of magnitude, not benchmarks; the point is
// "measure, find the bottleneck, add the one thing that removes it", not "start with microservices".
import assert from 'node:assert/strict';

const LIMITS = { appRps: 1_500, dbReads: 8_000, dbWrites: 3_000, singleBoxRps: 300 };
const PER_USER_PEAK_RPS = 0.05;      // e.g. 1M users -> 50,000 req/s at peak
const WRITE_SHARE = 0.08;

function load(users, { cacheHitRate = 0, offloadedSlowWork = false }) {
  const rps = users * PER_USER_PEAK_RPS;
  const writes = rps * WRITE_SHARE;
  const reads = (rps - writes) * (1 - cacheHitRate);
  const slowJobsInRequest = offloadedSlowWork ? 0 : rps * 0.01;   // PDFs and emails rendered in the request
  return { rps, reads, writes, slowJobsInRequest };
}

// Each stage = the design in place, and the bottleneck check that forces the next stage.
const stages = [
  { name: 'Stage 1', users: 1_000, design: '1 server: app + DB on one box',
    check: (l) => l.rps <= LIMITS.singleBoxRps, opts: {} },
  { name: 'Stage 2', users: 50_000, design: 'stateless app servers behind a LB, managed Postgres, sessions in Redis, static files on CDN',
    check: (l, s) => l.rps <= s.appServers * LIMITS.appRps && l.reads <= LIMITS.dbReads, opts: {}, appServers: 3 },
  { name: 'Stage 3', users: 300_000, design: 'Redis cache for hot reads, 2 read replicas, background workers + queue for email/PDFs',
    check: (l, s) => l.rps <= s.appServers * LIMITS.appRps && l.reads <= LIMITS.dbReads * 3 && l.writes <= LIMITS.dbWrites && l.slowJobsInRequest === 0,
    opts: { cacheHitRate: 0.8, offloadedSlowWork: true }, appServers: 12 },
  { name: 'Stage 4', users: 1_000_000, design: 'partition the hottest tables, search in a separate engine, split services with clear ownership',
    check: (l, s) => l.rps <= s.appServers * LIMITS.appRps && l.reads <= LIMITS.dbReads * 3 && l.writes <= LIMITS.dbWrites * s.shards, opts: { cacheHitRate: 0.9, offloadedSlowWork: true }, appServers: 35, shards: 2 },
];

for (const [i, s] of stages.entries()) {
  const l = load(s.users, s.opts);
  const ok = s.check(l, s);
  console.log(`${s.name} (${s.users.toLocaleString()} users, ~${Math.round(l.rps).toLocaleString()} req/s): ${s.design}`);
  console.log(`         reads to DB ${Math.round(l.reads).toLocaleString()}/s, writes ${Math.round(l.writes).toLocaleString()}/s -> ${ok ? 'fits' : 'DOES NOT FIT'}`);
  assert.ok(ok, `${s.name} design handles its own load`);

  // The previous stage's design breaks at this stage's load: that's what justifies the change.
  if (i > 0) {
    const prev = stages[i - 1];
    const fitsWithOldDesign = prev.check(load(s.users, prev.opts), prev);
    console.log(`         (the ${prev.name} design at this load: ${fitsWithOldDesign ? 'fits' : 'breaks'})`);
    assert.equal(fitsWithOldDesign, false, `${s.name} is only needed because ${prev.name} breaks`);
  }
}

// Writes are the last thing to scale: caches and replicas don't help them, partitioning does.
const writesAt1M = load(1_000_000, {}).writes;
assert.ok(writesAt1M > LIMITS.dbWrites, 'at 1M users one primary cannot take all writes');
console.log(`writes at 1M users: ${writesAt1M.toLocaleString()}/s > one primary's ~${LIMITS.dbWrites.toLocaleString()}/s -> partition`);
console.log('OK: every stage is triggered by a measured bottleneck, in order');
