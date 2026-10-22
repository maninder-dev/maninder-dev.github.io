// Topic 197: Idempotency  (Full-Stack Handbook, Part 10)
// Run: npm run ex 197        (or: node 197-idempotency-key.js)
// What it shows: Express middleware that requires an Idempotency-Key, stores the first response and
// replays it for retries (even concurrent ones), and rejects the same key reused with a different body.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import express from 'express';
import { listen, sleep } from './lib.js';

// In production this is a table with UNIQUE(key) (or Redis SET NX). A Map is enough to show the logic.
const records = new Map(); // key -> { fingerprint, status, body } | { fingerprint, pending: Promise }

function idempotent() {
  return async (req, res, next) => {
    const key = req.get('Idempotency-Key');
    if (!key) return res.status(400).json({ error: 'Idempotency-Key header is required' });
    const fingerprint = createHash('sha256').update(JSON.stringify(req.body)).digest('hex');

    let rec = records.get(key);
    if (rec && rec.fingerprint !== fingerprint) {
      return res.status(422).json({ error: 'Idempotency-Key reused with a different request body' });
    }
    if (rec?.pending) await rec.pending; // a concurrent retry waits for the first request to finish
    rec = records.get(key);
    if (rec?.status) return res.set('Idempotent-Replayed', 'true').status(rec.status).json(rec.body);

    // First time: claim the key (like INSERT ... UNIQUE), then capture whatever the handler sends.
    let done;
    records.set(key, { fingerprint, pending: new Promise((r) => (done = r)) });
    const json = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 500) records.set(key, { fingerprint, status: res.statusCode, body });
      else records.delete(key); // server errors are not cached, so a retry can try again
      done();
      return json(body);
    };
    next();
  };
}

let charges = 0;
const app = express();
app.use(express.json());
app.post('/api/payments', idempotent(), async (req, res) => {
  await sleep(50); // the card network is slow
  charges++;
  res.status(201).json({ id: `pay_${charges}`, amount: req.body.amount, status: 'succeeded' });
});
const { url, close } = await listen(app);

const pay = (key, body) => fetch(`${url}/api/payments`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(key && { 'Idempotency-Key': key }) },
  body: JSON.stringify(body),
});

// 1. No key -> 400
assert.equal((await pay(null, { amount: 500 })).status, 400);

// 2. A double-click: the same request fires twice at the same time.
const key = randomUUID();
const [a, b] = await Promise.all([pay(key, { amount: 500 }), pay(key, { amount: 500 })]);
const [ba, bb] = [await a.json(), await b.json()];
console.log('double click :', a.status, ba.id, '|', b.status, bb.id, 'replayed:', b.headers.get('idempotent-replayed') ?? a.headers.get('idempotent-replayed'));
assert.equal(charges, 1, 'card charged exactly once');
assert.deepEqual(ba, bb, 'both callers got the same payment');

// 3. A retry after a network timeout, much later: same stored response.
const retry = await pay(key, { amount: 500 });
assert.equal(retry.status, 201);
assert.equal(retry.headers.get('idempotent-replayed'), 'true');
assert.equal((await retry.json()).id, ba.id);
console.log('later retry  :', retry.status, 'replayed the stored response; charges =', charges);

// 4. Same key, different body: a client bug, refuse loudly.
const misuse = await pay(key, { amount: 9999 });
assert.equal(misuse.status, 422);
console.log('key reused   :', misuse.status, (await misuse.json()).error);

// 5. A new key is a new payment.
await pay(randomUUID(), { amount: 500 });
assert.equal(charges, 2);

await close();
console.log('OK: retries and double-clicks are safe; one charge per key');
