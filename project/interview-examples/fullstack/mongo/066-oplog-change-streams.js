// Topic 66: What is the Oplog?  (Full-Stack Handbook, Part 3)
// Run: npm run ex 66        (or: node 066-oplog-change-streams.js)
// What it shows: on a (single-node) replica set, writes land in the capped local.oplog.rs in an
// idempotent form ($inc becomes a $set of the result), and a change stream built on it sees them live.
import assert from 'node:assert/strict';
import { withMongo, section } from './lib/db.js';

await withMongo({ replSet: true }, async ({ client, db }) => {
  const orders = db.collection('orders');
  await db.createCollection('orders');

  section('Change stream: react to new orders in real time');
  const seen = [];
  const stream = orders.watch([{ $match: { operationType: { $in: ['insert', 'update'] } } }], { fullDocument: 'updateLookup' });
  const done = new Promise((resolve) => {
    stream.on('change', (c) => {
      seen.push(c);
      console.log('change:', c.operationType, c.fullDocument?._id, c.updateDescription?.updatedFields ?? '');
      if (seen.length === 3) resolve();
    });
  });
  await new Promise((r) => setTimeout(r, 300)); // let the cursor open before writing

  await orders.insertOne({ _id: 1, userId: 42, status: 'new', views: 0 });
  await orders.insertOne({ _id: 2, userId: 7, status: 'new', views: 0 });
  await orders.updateOne({ _id: 1 }, { $set: { status: 'paid' }, $inc: { views: 1 } });
  await orders.deleteOne({ _id: 2 }); // filtered out by the $match above
  await done;
  await stream.close();
  assert.deepEqual(seen.map((c) => c.operationType), ['insert', 'insert', 'update']);
  assert.equal(seen[2].fullDocument.status, 'paid');

  // The resume token lets a consumer restart exactly where it stopped after a crash.
  const resumed = orders.watch([], { startAfter: seen[1]._id });
  const next = await resumed.next();
  console.log('resumed after 2nd event ->', next.operationType, next.documentKey);
  assert.equal(next.operationType, 'update');
  await resumed.close();

  section('The oplog itself: local.oplog.rs');
  const oplog = client.db('local').collection('oplog.rs');
  const opts = await client.db('local').listCollections({ name: 'oplog.rs' }).toArray();
  console.log('capped collection:', opts[0].options.capped, '| max size bytes:', opts[0].options.size);
  assert.equal(opts[0].options.capped, true);

  const entries = await oplog.find({ ns: 'shop.orders' }).sort({ $natural: 1 }).toArray();
  for (const e of entries) console.log(e.op, JSON.stringify(e.o), e.o2 ? `o2=${JSON.stringify(e.o2)}` : '');
  assert.deepEqual(entries.map((e) => e.op), ['i', 'i', 'u', 'd']);

  // Idempotent form: $inc: { views: 1 } was recorded as the resulting value, so replaying the
  // entry twice on a secondary gives the same document.
  const update = entries[2];
  assert.equal(update.o.$v, 2);
  assert.deepEqual(update.o.diff.u, { status: 'paid', views: 1 });
  console.log('$inc recorded as diff.u.views = 1 (a set, safe to re-apply)');

  const last = await oplog.find().sort({ $natural: -1 }).limit(1).next();
  console.log('newest oplog entry ts: { t:', last.ts.t, ', i:', last.ts.i, '} (seconds, ordinal)');
});
console.log('\nOK');
