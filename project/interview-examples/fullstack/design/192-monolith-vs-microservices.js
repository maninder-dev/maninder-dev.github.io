// Topic 192: Monolith vs Microservices  (Full-Stack Handbook, Part 10)
// Run: npm run ex 192        (or: node 192-monolith-vs-microservices.js)
// What it shows: the same "place order" use case as an in-process module call (monolith) and as an
// HTTP call to a separate inventory service - and the new costs: latency and partial failure.
import assert from 'node:assert/strict';
import express from 'express';
import { listen } from './lib.js';

// --- A well-modularised monolith: modules talk through plain function interfaces. ---
const inventoryModule = {
  stock: new Map([['SKU-1', 5]]),
  reserve(sku, qty) {
    const left = this.stock.get(sku) ?? 0;
    if (left < qty) throw new Error('out of stock');
    this.stock.set(sku, left - qty);
    return { sku, reserved: qty };
  },
};
const placeOrderMonolith = (sku, qty) => ({ status: 'CONFIRMED', ...inventoryModule.reserve(sku, qty) });

// --- The same inventory module extracted into its own service with its own data. ---
const svc = express();
svc.use(express.json());
const stock = new Map([['SKU-1', 5]]);
let down = false;
svc.post('/reserve', (req, res) => {
  if (down) return res.status(503).json({ error: 'inventory unavailable' });
  const { sku, qty } = req.body;
  if ((stock.get(sku) ?? 0) < qty) return res.status(409).json({ error: 'out of stock' });
  stock.set(sku, stock.get(sku) - qty);
  res.json({ sku, reserved: qty });
});
const inventory = await listen(svc);

async function placeOrderMicroservice(sku, qty) {
  const res = await fetch(`${inventory.url}/reserve`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sku, qty }), signal: AbortSignal.timeout(2000), // always set a timeout
  });
  if (!res.ok) throw new Error(`inventory said ${res.status}`);
  return { status: 'CONFIRMED', ...(await res.json()) };
}

// Same behaviour from both...
assert.deepEqual(placeOrderMonolith('SKU-1', 2), { status: 'CONFIRMED', sku: 'SKU-1', reserved: 2 });
assert.deepEqual(await placeOrderMicroservice('SKU-1', 2), { status: 'CONFIRMED', sku: 'SKU-1', reserved: 2 });

// ...but very different cost per call.
const N = 200;
let t = performance.now();
for (let i = 0; i < N; i++) { inventoryModule.stock.set('SKU-1', 10); placeOrderMonolith('SKU-1', 1); }
const inProcessUs = ((performance.now() - t) / N) * 1000;
t = performance.now();
for (let i = 0; i < N; i++) { stock.set('SKU-1', 10); await placeOrderMicroservice('SKU-1', 1); }
const networkUs = ((performance.now() - t) / N) * 1000;
console.log(`in-process call: ${inProcessUs.toFixed(1)} us   HTTP call (localhost!): ${networkUs.toFixed(1)} us`);
assert.ok(networkUs > inProcessUs * 5, 'a network hop is far slower than a function call');

// And a new failure mode: the caller now fails when another service is down.
down = true;
await assert.rejects(placeOrderMicroservice('SKU-1', 1), /503/);
console.log('inventory down -> order placement fails (availability is coupled; see 193 for circuit breakers)');

await inventory.close();
console.log('OK: same use case, microservices add latency and partial failure');
