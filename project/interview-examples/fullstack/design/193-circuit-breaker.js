// Topic 193: Microservice Communication Patterns  (Full-Stack Handbook, Part 10)
// Run: npm run ex 193        (or: node 193-circuit-breaker.js)
// What it shows: a resilient synchronous call - timeout + fallback + circuit breaker (opossum) -
// against a flaky fake inventory service. The breaker opens, fails fast, then half-opens and recovers.
import assert from 'node:assert/strict';
import CircuitBreaker from 'opossum';
import { sleep } from './lib.js';

// A fake remote service whose health we control. `calls` counts real calls that reached it.
const inventory = { healthy: true, slow: false, calls: 0 };
async function callInventory(sku) {
  inventory.calls++;
  if (inventory.slow) await sleep(300);
  if (!inventory.healthy) throw new Error('ECONNREFUSED');
  return { data: { sku, available: 7 } };
}

const breaker = new CircuitBreaker(callInventory, {
  timeout: 1000,                 // a call slower than this counts as a failure
  errorThresholdPercentage: 50,  // open when half the recent calls fail...
  volumeThreshold: 4,            // ...once at least 4 calls have been seen
  resetTimeout: 500,             // after 500 ms let one trial call through (half-open)
});
breaker.fallback(() => ({ data: { available: null, note: 'Stock check unavailable' } }));
const states = [];
for (const ev of ['open', 'halfOpen', 'close']) breaker.on(ev, () => states.push(ev));

// 1. Healthy: real answers.
assert.equal((await breaker.fire('SKU-42')).data.available, 7);
console.log('healthy      ->', breaker.opened ? 'OPEN' : 'CLOSED');

// 2. The service breaks. Calls fail and the fallback answers instead of throwing.
inventory.healthy = false;
for (let i = 0; i < 4; i++) {
  const r = await breaker.fire('SKU-42');
  assert.equal(r.data.available, null);
}
assert.ok(breaker.opened, 'breaker should be open after repeated failures');
console.log('failing      -> OPEN   (fallback served)');

// 3. While open, calls never reach the sick service: fast failure, no pile-up.
const before = inventory.calls;
const rejectsBefore = breaker.stats.rejects;
const t0 = performance.now();
for (let i = 0; i < 20; i++) await breaker.fire('SKU-42');
const ms = performance.now() - t0;
assert.equal(inventory.calls, before, 'open breaker short-circuits calls');
console.log(`open         -> 20 calls in ${ms.toFixed(1)} ms, 0 reached the service`);

// 4. Timeouts count as failures too (a slow dependency is as bad as a dead one).
const slowBreaker = new CircuitBreaker(callInventory, { timeout: 50 });
inventory.healthy = true; inventory.slow = true;
await assert.rejects(slowBreaker.fire('SKU-1'), /Timed out/);
inventory.slow = false;
console.log('slow call    -> rejected by the 50 ms timeout');

// 5. Service recovers; after resetTimeout one trial call goes through and closes the breaker.
await sleep(600);
assert.ok(breaker.halfOpen, 'after resetTimeout the breaker is half-open');
assert.equal((await breaker.fire('SKU-42')).data.available, 7);
assert.ok(breaker.closed);
console.log('recovered    -> CLOSED');

assert.deepEqual(states, ['open', 'halfOpen', 'close']);
const s = breaker.stats;
console.log(`stats: fires=${s.fires} failures=${s.failures} shortCircuited=${s.rejects} fallbacks=${s.fallbacks}`);
assert.equal(s.rejects - rejectsBefore, 20, 'every call while open was short-circuited');
breaker.shutdown(); slowBreaker.shutdown();
console.log('OK: closed -> open -> half-open -> closed');
