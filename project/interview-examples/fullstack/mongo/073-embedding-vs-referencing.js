// Topic 73: Data Modeling: Embedding vs Referencing  (Full-Stack Handbook, Part 3)
// Run: npm run ex 73        (or: node 073-embedding-vs-referencing.js)
// What it shows: embed (order + items, one read), reference (comments in their own indexed
// collection, joined with $lookup), extended reference (copy the author name), and the Subset,
// Bucket and Computed patterns.
import assert from 'node:assert/strict';
import { withMongo, section } from './lib/db.js';

await withMongo({}, async ({ db }) => {
  section('Embed: an order owns its items, read in one go');
  const orders = db.collection('orders');
  await orders.insertOne({ _id: 1, userId: 42, items: [{ sku: 'A1', qty: 2, price: 200 }], total: 400 });
  const order = await orders.findOne({ _id: 1 }); // 1 query, no join
  assert.equal(order.items[0].sku, 'A1');
  console.log('order + items in one read:', order.items);

  section('Reference: comments are unbounded, so they live in their own collection');
  const posts = db.collection('posts');
  const comments = db.collection('comments');
  await posts.insertOne({ _id: 'p1', title: 'Post', author: { _id: 42, name: 'Alice' } }); // extended reference
  await comments.createIndex({ postId: 1, createdAt: -1 });
  await comments.insertMany(Array.from({ length: 50 }, (_, i) => ({ postId: 'p1', author: 'bob', text: `#${i}`, createdAt: new Date(2026, 0, 1, 0, i) })));
  const page = await comments.find({ postId: 'p1' }).sort({ createdAt: -1 }).limit(10).toArray();
  assert.equal(page.length, 10);
  assert.equal(page[0].text, '#49');
  console.log('latest 10 of', await comments.countDocuments({ postId: 'p1' }), 'comments, paged via the { postId, createdAt } index');

  const [withCount] = await posts.aggregate([
    { $lookup: { from: 'comments', localField: '_id', foreignField: 'postId', as: 'c', pipeline: [{ $count: 'n' }] } },
    { $project: { title: 1, authorName: '$author.name', comments: { $first: '$c.n' } } },
  ]).toArray();
  console.log(withCount);
  assert.deepEqual(withCount, { _id: 'p1', title: 'Post', authorName: 'Alice', comments: 50 });
  // authorName came from the copied field: no lookup into users needed for display.

  section('Subset pattern: keep the latest 3 reviews embedded, all reviews elsewhere');
  const products = db.collection('products');
  const reviews = db.collection('reviews');
  await products.insertOne({ _id: 'sku1', name: 'Kettle', recentReviews: [] });
  for (let i = 1; i <= 6; i++) {
    const r = { productId: 'sku1', stars: (i % 5) + 1, text: `review ${i}` };
    await reviews.insertOne(r);
    await products.updateOne({ _id: 'sku1' }, { $push: { recentReviews: { $each: [{ stars: r.stars, text: r.text }], $position: 0, $slice: 3 } } });
  }
  const kettle = await products.findOne({ _id: 'sku1' });
  console.log('embedded:', kettle.recentReviews.map((r) => r.text), '| total:', await reviews.countDocuments());
  assert.deepEqual(kettle.recentReviews.map((r) => r.text), ['review 6', 'review 5', 'review 4']);

  section('Bucket pattern: one document per sensor per hour');
  const readings = db.collection('readings');
  for (let m = 0; m < 120; m++) {
    const at = new Date(Date.UTC(2026, 9, 15, 10, m));
    const hour = new Date(Date.UTC(2026, 9, 15, 10 + Math.floor(m / 60)));
    await readings.updateOne(
      { sensor: 's1', hour },
      { $push: { samples: { at, temp: 20 + (m % 5) } }, $inc: { count: 1, sum: 20 + (m % 5) } }, // Computed pattern: running totals
      { upsert: true },
    );
  }
  const buckets = await readings.find().sort({ hour: 1 }).toArray();
  console.log(buckets.map((b) => ({ hour: b.hour.toISOString().slice(11, 16), count: b.count, avg: b.sum / b.count })));
  assert.equal(buckets.length, 2); // 120 readings -> 2 documents (and 2 index entries)
  assert.equal(buckets[0].count, 60);
  assert.equal(buckets[0].sum / buckets[0].count, 22); // average without scanning samples
});
console.log('\nOK');
