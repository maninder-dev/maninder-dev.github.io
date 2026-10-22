// Topic 225: Debugging - a background job sometimes runs twice  (Full-Stack Handbook, Part 11)
// Run: npm run ex 225        (or: node 225-idempotent-job.js)
// What it shows: queues deliver at least once, so the same job can run twice at the same time.
// BUG - check-then-send emails the invoice twice. FIX - a conditional UPDATE claims the job
// atomically (rowCount 0 = someone else has it) and the mailer gets an idempotency key.
// Simulated: an in-memory table whose claim() mimics
//   UPDATE orders SET invoice_status='sending' WHERE id=$1 AND invoice_status='pending'
// (one atomic statement in Postgres; here it is synchronous JS, which is equally atomic).
import assert from 'node:assert/strict';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeWorld() {
  const orders = new Map([[1, { id: 1, invoice_status: 'pending' }]]);
  const sent = [];
  const seenKeys = new Set();
  const db = {
    async get(id) { await sleep(5); return { ...orders.get(id) }; },
    async setStatus(id, s) { await sleep(5); orders.get(id).invoice_status = s; },
    async claim(id, from, to) { // conditional update: returns rowCount
      await sleep(5);
      const row = orders.get(id);
      if (row.invoice_status !== from) return { rowCount: 0 };
      row.invoice_status = to;
      return { rowCount: 1 };
    },
  };
  const mailer = {
    async send(msg, { idempotencyKey } = {}) {
      await sleep(10);
      if (idempotencyKey && seenKeys.has(idempotencyKey)) return { duplicate: true }; // provider dedupes
      if (idempotencyKey) seenKeys.add(idempotencyKey);
      sent.push(msg);
    },
  };
  return { orders, sent, db, mailer };
}

// BUG: read, check, then act. Two runs both read 'pending' before either writes 'sent'.
async function sendInvoiceNaive({ db, mailer }, { orderId }) {
  const order = await db.get(orderId);
  if (order.invoice_status !== 'pending') return 'skipped';
  await mailer.send({ to: 'customer@example.com', orderId });
  await db.setStatus(orderId, 'sent');
  return 'sent';
}

// FIX: claim first, atomically; only the winner continues
async function sendInvoiceSafe({ db, mailer }, { orderId }) {
  const updated = await db.claim(orderId, 'pending', 'sending');
  if (updated.rowCount === 0) return 'skipped'; // another run already took it
  await mailer.send({ to: 'customer@example.com', orderId }, { idempotencyKey: `invoice-${orderId}` });
  await db.setStatus(orderId, 'sent');
  return 'sent';
}

// The queue redelivers the job (worker crashed before ack, visibility timeout...): two runs at once
const bad = makeWorld();
const r1 = await Promise.all([sendInvoiceNaive(bad, { orderId: 1 }), sendInvoiceNaive(bad, { orderId: 1 })]);
console.log('BUG  runs:', r1.join(', '), '| emails sent:', bad.sent.length);
assert.equal(bad.sent.length, 2, 'customer got the invoice twice');

const good = makeWorld();
const r2 = await Promise.all([sendInvoiceSafe(good, { orderId: 1 }), sendInvoiceSafe(good, { orderId: 1 })]);
console.log('FIX  runs:', r2.sort().join(', '), '| emails sent:', good.sent.length, '| status:', good.orders.get(1).invoice_status);
assert.deepEqual(r2.sort(), ['sent', 'skipped']);
assert.equal(good.sent.length, 1);
assert.equal(good.orders.get(1).invoice_status, 'sent');

// A late third delivery after success is also a no-op
assert.equal(await sendInvoiceSafe(good, { orderId: 1 }), 'skipped');

// Crash after the email but before marking 'sent', then a retry resets and resends:
// the idempotency key makes the provider drop the duplicate.
good.orders.get(1).invoice_status = 'pending';
await sendInvoiceSafe(good, { orderId: 1 });
console.log('retry after a crash mid-job -> emails sent:', good.sent.length, '(provider deduped by key)');
assert.equal(good.sent.length, 1);
console.log('OK');
