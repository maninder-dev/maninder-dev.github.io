// Topic 224: System Design Questions - a notification system  (Full-Stack Handbook, Part 11)
// Run: npm run ex 224        (or: node 224-notifications.js)
// What it shows: POST /notify -> dedupe by idempotency key -> check preferences and quiet hours -> fan out
// to per-channel queues -> workers render a versioned template, call a fake provider with retries and
// backoff, dead-letter after max tries -> status stored per delivery, plus an in-app inbox.
// (In-process simulation: queues are arrays, SES/FCM are fake providers.)
import assert from 'node:assert/strict';
import express from 'express';
import { listen, sleep } from './lib.js';

const prefs = new Map([
  [1, { email: true, push: true, sms: false, quietHours: null }],
  [2, { email: true, push: false, sms: true, quietHours: [22, 7] }],
]);
const templates = { order_shipped: { version: 3, email: (d) => `Your order #${d.orderId} has shipped`, push: (d) => `Order #${d.orderId} shipped!`, sms: (d) => `Order ${d.orderId} shipped` } };
const notifications = [];                 // the notifications table: one row per channel delivery
const seenKeys = new Map();               // idempotencyKey -> created rows
const queues = { email: [], push: [], sms: [] };
const MAX_TRIES = 5;

// Fake providers: push fails twice for a while (transient), sms always fails for user 2 (bad number)
let pushFailures = 2;
const providers = {
  email: async () => ({ providerId: 'ses-' + Math.random().toString(36).slice(2, 8) }),
  push: async () => { if (pushFailures-- > 0) throw new Error('FCM 503'); return { providerId: 'fcm-1' }; },
  sms: async () => { throw new Error('invalid phone number'); },
};

const app = express();
app.use(express.json());
app.post('/notify', (req, res) => {
  const { userId, template, data, idempotencyKey, hour = 12 } = req.body;
  if (seenKeys.has(idempotencyKey)) return res.status(200).json({ deduped: true, ids: seenKeys.get(idempotencyKey) });
  const p = prefs.get(userId);
  const quiet = p.quietHours && (hour >= p.quietHours[0] || hour < p.quietHours[1]);
  const ids = [];
  for (const channel of ['email', 'push', 'sms']) {
    if (!p[channel]) continue;                                         // user opted out of this channel
    const row = { id: notifications.length + 1, userId, channel, template: `${template}@v${templates[template].version}`, data,
      status: quiet && channel !== 'email' ? 'delayed' : 'queued', tries: 0, read: false };
    notifications.push(row); ids.push(row.id);
    if (row.status === 'queued') queues[channel].push(row.id);
  }
  seenKeys.set(idempotencyKey, ids);
  res.status(202).json({ ids });                                       // accepted: work happens async
});
app.get('/users/:id/notifications', (req, res) => res.json(notifications.filter((n) => n.userId === Number(req.params.id) && n.channel === 'push')));
const { url, close } = await listen(app);

async function worker(channel) {                                       // one per channel, scaled independently
  while (queues[channel].length) {
    const row = notifications[queues[channel].shift() - 1];
    row.tries++;
    try {
      const body = templates[row.template.split('@')[0]][channel](row.data);
      Object.assign(row, await providers[channel](body), { status: 'sent', body });
    } catch (e) {
      row.lastError = e.message;
      if (row.tries >= MAX_TRIES) { row.status = 'failed'; continue; }  // -> DLQ for inspection
      await sleep(5 * 2 ** row.tries);                                 // backoff
      queues[channel].push(row.id);
    }
  }
}

const notify = (body) => fetch(`${url}/notify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, ...(await r.json()) }));

const a = await notify({ userId: 1, template: 'order_shipped', data: { orderId: 981 }, idempotencyKey: 'ship-981' });
const dup = await notify({ userId: 1, template: 'order_shipped', data: { orderId: 981 }, idempotencyKey: 'ship-981' });
const b = await notify({ userId: 2, template: 'order_shipped', data: { orderId: 982 }, idempotencyKey: 'ship-982', hour: 23 });
console.log('POST /notify  :', a.status, a.ids, '| retry:', dup.status, 'deduped', dup.deduped, '| user 2 at 23:00:', b.ids);
assert.equal(a.status, 202);
assert.deepEqual(dup.ids, a.ids);

await Promise.all(Object.keys(queues).map(worker));
console.log('notifications :');
for (const n of notifications) console.log(`   #${n.id} user ${n.userId} ${n.channel.padEnd(5)} ${n.template} -> ${n.status}${n.tries ? ` after ${n.tries} tries` : ''}${n.lastError && n.status !== 'sent' ? ` (${n.lastError})` : ''}`);

const by = (u, c) => notifications.find((n) => n.userId === u && n.channel === c);
assert.equal(notifications.filter((n) => n.userId === 1).length, 2, 'dedupe: user 1 got one email + one push, not two of each');
assert.equal(by(1, 'sms'), undefined, 'user 1 opted out of SMS');
assert.equal(by(1, 'email').status, 'sent');
assert.equal(by(1, 'push').status, 'sent');
assert.equal(by(1, 'push').tries, 3, 'transient FCM errors retried with backoff');
assert.equal(by(2, 'email').status, 'sent', 'email is fine during quiet hours');
assert.equal(by(2, 'sms').status, 'delayed', 'SMS held until quiet hours end');
assert.equal(by(2, 'push'), undefined);

// Quiet hours end: the scheduler releases delayed rows; the bad number exhausts retries
for (const n of notifications.filter((x) => x.status === 'delayed')) { n.status = 'queued'; queues[n.channel].push(n.id); }
await worker('sms');
assert.equal(by(2, 'sms').status, 'failed');
assert.equal(by(2, 'sms').tries, MAX_TRIES);
console.log(`after 07:00   : user 2 sms -> failed after ${by(2, 'sms').tries} tries (${by(2, 'sms').lastError}) -> DLQ`);

const inbox = await (await fetch(`${url}/users/1/notifications`)).json();
assert.equal(inbox[0].body, 'Order #981 shipped!');
console.log('in-app inbox  :', inbox.map((n) => n.body));
await close();
console.log('OK: dedupe, preferences, quiet hours, per-channel retries, DLQ and status tracking');
