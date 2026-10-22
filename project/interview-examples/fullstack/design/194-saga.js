// Topic 194: Distributed Transactions: The Saga Pattern  (Full-Stack Handbook, Part 10)
// Run: npm run ex 194        (or: node 194-saga.js)
// What it shows: an orchestrated "place order" saga over three fake services, each with its own data.
// When a later step fails, the compensations for the completed steps run in reverse order.
// (The outbox pattern mentioned in this topic is shown with a real table in 224-outbox.js.)
import assert from 'node:assert/strict';

const log = [];
function makeServices({ failAt } = {}) {
  const db = { orders: new Map(), payments: new Map(), stock: new Map([['SKU-1', 3]]) };
  const maybeFail = (step) => { if (failAt === step) throw new Error(`${step} failed`); };
  return {
    db,
    orders: {
      async create(o) { maybeFail('orders.create'); db.orders.set(o.id, 'PENDING'); log.push('order PENDING'); },
      async confirm(id) { maybeFail('orders.confirm'); db.orders.set(id, 'CONFIRMED'); log.push('order CONFIRMED'); },
      async cancel(id) { db.orders.set(id, 'CANCELLED'); log.push('undo: order CANCELLED'); },
    },
    payments: {
      async charge(o) { maybeFail('payments.charge'); db.payments.set(o.id, o.amount); log.push(`charged ${o.amount}`); },
      async refund(id) { db.payments.set(id, 0); log.push('undo: refunded'); },
    },
    inventory: {
      async reserve(items) {
        maybeFail('inventory.reserve');
        for (const { sku, qty } of items) {
          if (db.stock.get(sku) < qty) throw new Error(`not enough ${sku}`);
          db.stock.set(sku, db.stock.get(sku) - qty);
        }
        log.push('stock reserved');
      },
      async release(items) { for (const { sku, qty } of items) db.stock.set(sku, db.stock.get(sku) + qty); log.push('undo: stock released'); },
    },
  };
}

// Each step registers its compensation only after it succeeds.
async function placeOrderSaga({ orders, payments, inventory }, order) {
  const done = [];
  try {
    await orders.create(order);           done.push(() => orders.cancel(order.id));
    await payments.charge(order);         done.push(() => payments.refund(order.id));
    await inventory.reserve(order.items); done.push(() => inventory.release(order.items));
    await orders.confirm(order.id);
  } catch (err) {
    for (const undo of done.reverse()) await undo(); // compensate in reverse order
    throw err;
  }
}

const order = { id: 'o1', amount: 4999, items: [{ sku: 'SKU-1', qty: 2 }] };

// Happy path
let s = makeServices();
log.length = 0;
await placeOrderSaga(s, order);
console.log('happy path   :', log.join(' -> '));
assert.equal(s.db.orders.get('o1'), 'CONFIRMED');
assert.equal(s.db.stock.get('SKU-1'), 1);

// The last step fails: every earlier step is undone, newest first.
s = makeServices({ failAt: 'orders.confirm' });
log.length = 0;
await assert.rejects(placeOrderSaga(s, order), /orders.confirm failed/);
console.log('confirm fails:', log.join(' -> '));
assert.deepEqual(log.slice(3), ['undo: stock released', 'undo: refunded', 'undo: order CANCELLED']);
assert.equal(s.db.stock.get('SKU-1'), 3, 'stock restored');
assert.equal(s.db.payments.get('o1'), 0, 'payment refunded');
assert.equal(s.db.orders.get('o1'), 'CANCELLED');

// A business failure (not enough stock) in the middle: only the steps that ran are compensated.
s = makeServices();
log.length = 0;
await assert.rejects(placeOrderSaga(s, { ...order, items: [{ sku: 'SKU-1', qty: 10 }] }), /not enough/);
console.log('no stock     :', log.join(' -> '));
assert.deepEqual(log, ['order PENDING', 'charged 4999', 'undo: refunded', 'undo: order CANCELLED']);

// Note: there is no isolation. Between "charged" and "refunded" other readers can see the charge.
// That's why the order sits in PENDING and why compensations must themselves be idempotent and retried.
console.log('OK: compensations run in reverse for exactly the steps that completed');
