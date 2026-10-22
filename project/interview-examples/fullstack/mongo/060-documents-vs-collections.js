// Topic 60: Documents vs Collections  (Full-Stack Handbook, Part 3)
// Run: npm run ex 60        (or: node 060-documents-vs-collections.js)
// What it shows: database > collection > document, collections created lazily on first insert,
// documents in one collection with different fields, and the 16 MB per-document limit.
import assert from 'node:assert/strict';
import { BSON } from 'mongodb';
import { withMongo, section } from './lib/db.js';

await withMongo({ dbName: 'shop' }, async ({ client, db }) => {
  section('Collections appear on first write');
  assert.deepEqual(await db.listCollections().toArray(), []);
  const orders = db.collection('orders'); // just a handle, nothing created yet
  const res = await orders.insertMany([
    { userId: 1, items: [{ sku: 'A1', qty: 2 }], total: 400 },
    { userId: 2, items: [{ sku: 'B7', qty: 1 }], total: 90, coupon: 'DIWALI' },
  ]);
  console.log('inserted', res.insertedCount, 'documents; _id generated client-side:', Object.values(res.insertedIds)[0]);
  const names = (await db.listCollections().toArray()).map((c) => c.name);
  console.log('collections in "shop":', names);
  assert.deepEqual(names, ['orders']);

  const dbs = (await client.db().admin().listDatabases()).databases.map((d) => d.name);
  console.log('databases:', dbs);
  assert.ok(dbs.includes('shop'));

  section('Same collection, different fields');
  const withCoupon = await orders.countDocuments({ coupon: { $exists: true } });
  assert.equal(withCoupon, 1);

  section('16 MB document limit');
  const { maxBsonObjectSize } = await db.command({ hello: 1 });
  console.log('server maxBsonObjectSize =', maxBsonObjectSize, 'bytes (16 MiB)');
  assert.equal(maxBsonObjectSize, 16 * 1024 * 1024);
  const big = 'x'.repeat(17 * 1024 * 1024);
  assert.ok(BSON.calculateObjectSize({ blob: big }) > maxBsonObjectSize);
  await assert.rejects(() => orders.insertOne({ userId: 3, blob: big }), (err) => {
    // The driver refuses to serialize a document over maxBsonObjectSize (16 MB), so the
    // error comes from the client before the server would reject it anyway.
    console.log('17 MB insert rejected:', err.name);
    return true;
  });
  const ok = 'x'.repeat(15 * 1024 * 1024);
  await orders.insertOne({ userId: 4, blob: ok });
  console.log('15 MB insert accepted');
  assert.equal(await orders.countDocuments(), 3);
  // Rule of thumb: an array that can grow without bound will hit this limit -> reference instead.
});
console.log('\nOK');
