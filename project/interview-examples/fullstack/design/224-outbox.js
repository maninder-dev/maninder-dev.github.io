// Topic 224: System Design Questions - transactional outbox  (Full-Stack Handbook, Part 11)
// Run: npm run ex 224        (or: node 224-outbox.js)
// What it shows: the dual-write bug (DB commit succeeds, broker publish fails -> event lost forever) and the
// fix: write the order and its outbox row in ONE transaction; a relay publishes unsent rows and marks
// them sent. A broker outage only delays events; nothing is lost. PostgreSQL via PGlite, broker in memory.
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
await db.exec(`
  CREATE TABLE orders (id serial PRIMARY KEY, customer text, total int);
  CREATE TABLE outbox (id bigserial PRIMARY KEY, topic text NOT NULL, payload jsonb NOT NULL,
                       created_at timestamptz DEFAULT now(), sent_at timestamptz);
  CREATE INDEX outbox_unsent ON outbox (id) WHERE sent_at IS NULL;`);

const broker = { up: true, published: [], send({ topic, value }) { if (!this.up) throw new Error('broker unavailable'); this.published.push({ topic, ...value }); } };
const count = async (sql) => (await db.query(sql)).rows[0].n;

// ---------- the bug: dual write ----------
async function createOrderDualWrite(customer, total) {
  const { rows: [order] } = await db.query('INSERT INTO orders(customer, total) VALUES ($1, $2) RETURNING *', [customer, total]);
  broker.send({ topic: 'order.created', value: { orderId: order.id } }); // may fail AFTER the commit
  return order;
}
broker.up = false;
await assert.rejects(createOrderDualWrite('ann', 500), /broker unavailable/);
console.log(`dual write : order saved = ${await count('SELECT count(*)::int AS n FROM orders')}, events published = ${broker.published.length} -> event lost`);
assert.equal(broker.published.length, 0);

// ---------- the fix: outbox in the same transaction ----------
async function createOrder(customer, total, { failAfterInsert = false } = {}) {
  return db.transaction(async (tx) => {
    const { rows: [order] } = await tx.query('INSERT INTO orders(customer, total) VALUES ($1, $2) RETURNING *', [customer, total]);
    if (failAfterInsert) throw new Error('validation failed');
    await tx.query('INSERT INTO outbox(topic, payload) VALUES ($1, $2)', ['order.created', JSON.stringify({ orderId: order.id, total })]);
    return order;
  });
}

// Relay: runs every second in production (or uses CDC such as Debezium); FOR UPDATE SKIP LOCKED lets several relays run safely.
async function relayOnce(batch = 100) {
  return db.transaction(async (tx) => {
    const { rows } = await tx.query('SELECT id, topic, payload FROM outbox WHERE sent_at IS NULL ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED', [batch]);
    let sent = 0;
    for (const r of rows) {
      try { broker.send({ topic: r.topic, value: r.payload }); } catch { break; }  // stop; retry next tick, keep order
      await tx.query('UPDATE outbox SET sent_at = now() WHERE id = $1', [r.id]);
      sent++;
    }
    return sent;
  });
}

const before = await count('SELECT count(*)::int AS n FROM orders');
await assert.rejects(createOrder('bob', 100, { failAfterInsert: true }));
assert.equal(await count('SELECT count(*)::int AS n FROM orders'), before, 'rolled back: no order...');
assert.equal(await count('SELECT count(*)::int AS n FROM outbox'), 0, '...and no event');

// Broker is down while customers keep ordering: writes still succeed
for (const [c, t] of [['cy', 700], ['dee', 300], ['eve', 900]]) await createOrder(c, t);
assert.equal(await relayOnce(), 0);
console.log(`broker down: 3 orders saved, ${await count('SELECT count(*)::int AS n FROM outbox WHERE sent_at IS NULL')} events waiting in the outbox`);

broker.up = true;
const sent = await relayOnce();
console.log(`broker up  : relay published ${sent}:`, broker.published.map((e) => `#${e.orderId}`).join(', '));
assert.equal(sent, 3);
assert.deepEqual(broker.published.map((e) => e.total), [700, 300, 900], 'published in commit order');
assert.equal(await count('SELECT count(*)::int AS n FROM outbox WHERE sent_at IS NULL'), 0);
assert.equal(await relayOnce(), 0, 'nothing is sent twice by the relay');

// Caveat: if the relay crashes after send() but before its commit, the row is re-sent next tick.
// The outbox gives at-least-once publishing, so consumers must still be idempotent (see 224-exactly-once.js).
await db.close();
console.log('OK: data change and event are committed atomically; outages delay events but never lose them');
