// Topic 198: Designing a Payment System  (Full-Stack Handbook, Part 10)
// Run: npm run ex 198        (or: node 198-payment-webhook.js)
// What it shows: Stripe-style webhook signature verification (HMAC-SHA256 over "timestamp.rawBody",
// constant-time compare, 5-minute tolerance), idempotent processing by event id, a double-entry
// ledger that always sums to zero, and why money is stored in integer minor units.
// (Simulation: we sign events ourselves the way Stripe does; no Stripe SDK or network.)
import assert from 'node:assert/strict';
import { createHmac, timingSafeEqual } from 'node:crypto';
import express from 'express';
import { listen } from './lib.js';

const WEBHOOK_SECRET = 'whsec_test_only_not_a_real_secret';
const TOLERANCE_S = 300;

// What the provider does: header "t=<unix>,v1=<hex hmac of `${t}.${body}`>"
const sign = (body, t = Math.floor(Date.now() / 1000), secret = WEBHOOK_SECRET) =>
  `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;

function constructEvent(rawBody, header, secret) {
  const parts = Object.fromEntries((header ?? '').split(',').map((kv) => kv.split('=')));
  if (!parts.t || !parts.v1) throw new Error('missing signature');
  const expected = createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest();
  const given = Buffer.from(parts.v1, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new Error('bad signature');
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > TOLERANCE_S) throw new Error('timestamp too old (replay?)');
  return JSON.parse(rawBody);
}

// "Database"
const orders = new Map([['ord_1', { status: 'pending', paymentIntentId: 'pi_1' }]]);
const processedEvents = new Set();
const ledger = [];

const app = express();
// The raw body is required: re-serialising parsed JSON changes bytes and breaks the signature.
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  let event;
  try { event = constructEvent(req.body.toString('utf8'), req.get('stripe-signature'), WEBHOOK_SECRET); }
  catch (e) { return res.status(400).send(`Invalid signature: ${e.message}`); }

  if (!processedEvents.has(event.id)) {     // in SQL: one transaction for all three writes
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      for (const o of orders.values()) if (o.paymentIntentId === pi.id) o.status = 'paid';
      ledger.push({ account: 'customer_receivable', amount: -pi.amount }, { account: 'revenue', amount: pi.amount });
    }
    processedEvents.add(event.id);
  }
  res.sendStatus(200); // return 200 fast; heavy work belongs in a queue
});
const { url, close } = await listen(app);

const body = JSON.stringify({ id: 'evt_1', type: 'payment_intent.succeeded', data: { object: { id: 'pi_1', amount: 129900 } } });
const post = (b, sig) => fetch(`${url}/webhooks/stripe`, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': sig }, body: b });

// Forged: signed with the wrong secret
let r = await post(body, sign(body, undefined, 'whsec_attacker'));
console.log('wrong secret   ->', r.status, await r.text());
assert.equal(r.status, 400);

// Tampered: valid signature for the original body, but the amount was changed in transit
r = await post(body.replace('129900', '1'), sign(body));
assert.equal(r.status, 400);
console.log('tampered body  ->', r.status);

// Replayed: a captured request from an hour ago
r = await post(body, sign(body, Math.floor(Date.now() / 1000) - 3600));
assert.equal(r.status, 400);
console.log('old timestamp  ->', r.status);

// Genuine, then delivered again (providers retry on timeouts)
assert.equal((await post(body, sign(body))).status, 200);
assert.equal((await post(body, sign(body))).status, 200);
console.log('genuine x2     -> 200, 200; order:', orders.get('ord_1').status, '; ledger rows:', ledger.length);
assert.equal(orders.get('ord_1').status, 'paid');
assert.equal(ledger.length, 2, 'second delivery did not double-book');
assert.equal(ledger.reduce((s, e) => s + e.amount, 0), 0, 'double-entry ledger balances to zero');

// Money: floats drift, integer paise/cents don't.
const floatTotal = 0.1 + 0.2;
const paiseTotal = 10 + 20;
console.log('0.1 + 0.2 =', floatTotal, '| 10 + 20 paise =', paiseTotal, 'paise');
assert.notEqual(floatTotal, 0.3);
assert.equal(paiseTotal / 100, 0.3);

await close();
console.log('OK: only correctly signed, fresh events are applied, and only once');
