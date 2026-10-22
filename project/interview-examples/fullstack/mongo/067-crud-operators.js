// Topic 67: CRUD Operators You Must Know  (Full-Stack Handbook, Part 3)
// Run: npm run ex 67        (or: node 067-crud-operators.js)
// What it shows: comparison/logical query operators, projection+sort+limit, and the update
// operators $set $inc $push $pull $addToSet, upsert, positional $, and deleteMany.
import assert from 'node:assert/strict';
import { withMongo, section } from './lib/db.js';

await withMongo({}, async ({ db }) => {
  const products = db.collection('products');
  await products.insertMany([
    { _id: 1, sku: 'P1', name: 'Phone A', category: 'phone', price: 300, stock: 4, tags: ['old', 'android'], views: 0 },
    { _id: 2, sku: 'P2', name: 'Phone B', category: 'phone', price: 650, stock: 0, tags: [], views: 0 },
    { _id: 3, sku: 'T1', name: 'Tablet', category: 'tablet', price: 450, stock: 2, tags: ['old'], views: 0 },
    { _id: 4, sku: 'L1', name: 'Laptop', category: 'laptop', price: 900, stock: 0, discontinued: true, tags: [], views: 0 },
    { _id: 5, sku: 'C1', name: 'Cable', category: 'accessory', price: 10, stock: 99, tags: [], views: 0 },
  ]);
  const names = (docs) => docs.map((d) => d.name);

  section('Read: $gte/$lte + $in');
  const midRange = await products.find({ price: { $gte: 100, $lte: 500 }, category: { $in: ['phone', 'tablet'] } }).toArray();
  console.log(names(midRange));
  assert.deepEqual(names(midRange), ['Phone A', 'Tablet']);

  section('Read: $or');
  const unsellable = await products.find({ $or: [{ stock: 0 }, { discontinued: true }] }).toArray();
  console.log(names(unsellable));
  assert.deepEqual(names(unsellable), ['Phone B', 'Laptop']);

  section('Read: projection, sort, limit');
  const top = await products.find({}, { projection: { name: 1, price: 1, _id: 0 } }).sort({ price: -1 }).limit(2).toArray();
  console.log(top);
  assert.deepEqual(top, [{ name: 'Laptop', price: 900 }, { name: 'Phone B', price: 650 }]);

  section('Update: $set + $inc in one atomic call');
  await products.updateOne({ _id: 3 }, { $set: { price: 450 }, $inc: { views: 1 } });
  await products.updateOne({ _id: 3 }, { $inc: { views: 1 } });
  assert.equal((await products.findOne({ _id: 3 })).views, 2);

  section('Update arrays: $push, $pull, $addToSet');
  await products.updateOne({ _id: 3 }, { $push: { tags: 'sale' } });
  await products.updateOne({ _id: 3 }, { $pull: { tags: 'old' } });
  await products.updateOne({ _id: 3 }, { $addToSet: { tags: 'sale' } }); // no duplicate
  const tablet = await products.findOne({ _id: 3 });
  console.log('tablet tags:', tablet.tags);
  assert.deepEqual(tablet.tags, ['sale']);

  section('Upsert: update if found, insert if not');
  const r1 = await products.updateOne({ sku: 'X1' }, { $set: { stock: 5 }, $setOnInsert: { name: 'New item' } }, { upsert: true });
  const r2 = await products.updateOne({ sku: 'X1' }, { $set: { stock: 7 } }, { upsert: true });
  console.log('first call upsertedCount:', r1.upsertedCount, '| second call modifiedCount:', r2.modifiedCount);
  assert.equal(r1.upsertedCount, 1);
  assert.equal(r2.modifiedCount, 1);
  assert.equal((await products.findOne({ sku: 'X1' })).stock, 7);

  section('Positional $: update the matched array element');
  const carts = db.collection('carts');
  await carts.insertOne({ _id: 'c1', items: [{ sku: 'A', qty: 1 }, { sku: 'B', qty: 1 }] });
  await carts.updateOne({ _id: 'c1', 'items.sku': 'B' }, { $inc: { 'items.$.qty': 2 } });
  assert.deepEqual((await carts.findOne({ _id: 'c1' })).items, [{ sku: 'A', qty: 1 }, { sku: 'B', qty: 3 }]);
  console.log('items.$.qty incremented only for sku B');

  section('findOneAndUpdate returns the document (atomic read-modify-write)');
  const reserved = await products.findOneAndUpdate(
    { _id: 1, stock: { $gt: 0 } }, { $inc: { stock: -1 } }, { returnDocument: 'after' },
  );
  assert.equal(reserved.stock, 3); // no race between "check stock" and "decrement"

  section('Delete');
  const del = await products.deleteMany({ stock: 0, discontinued: true });
  console.log('deleted', del.deletedCount);
  assert.equal(del.deletedCount, 1);
  assert.equal(await products.countDocuments(), 5);
});
console.log('\nOK');
