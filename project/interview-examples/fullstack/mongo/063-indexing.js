// Topic 63: Indexing in MongoDB  (Full-Stack Handbook, Part 3)
// Run: npm run ex 63        (or: node 063-indexing.js)
// What it shows: COLLSCAN vs IXSCAN, then each index type really working: unique, compound,
// multikey, text, 2dsphere, TTL (monitor sped up to 1 s) and partial. ESR is in 069 and 218.
import assert from 'node:assert/strict';
import { withMongo, section, planSummary } from './lib/db.js';

const explain = (cursor) => cursor.explain('executionStats').then(planSummary);

await withMongo({ args: ['--setParameter', 'ttlMonitorSleepSecs=1'] }, async ({ db }) => {
  const orders = db.collection('orders');
  await orders.insertMany(Array.from({ length: 5000 }, (_, i) => ({
    userId: i % 500, status: i % 50 === 0 ? 'pending' : 'paid', createdAt: new Date(2026, 0, 1 + (i % 300)),
  })));

  section('No index -> COLLSCAN reads every document');
  const before = await explain(orders.find({ userId: 42 }));
  console.log(before);
  assert.match(before.stages, /COLLSCAN/);
  assert.equal(before.docsExamined, 5000);

  section('Compound index { userId: 1, createdAt: -1 } -> IXSCAN, sort for free');
  await orders.createIndex({ userId: 1, createdAt: -1 });
  const after = await explain(orders.find({ userId: 42 }).sort({ createdAt: -1 }));
  console.log(after);
  assert.match(after.stages, /IXSCAN/);
  assert.doesNotMatch(after.stages, /SORT/); // index order already matches the sort
  assert.equal(after.docsExamined, 10);

  section('Unique single-field index');
  const users = db.collection('users');
  await users.createIndex({ email: 1 }, { unique: true });
  await users.insertOne({ email: 'a@x.io' });
  await assert.rejects(() => users.insertOne({ email: 'a@x.io' }), { code: 11000 });
  console.log('duplicate email -> E11000 duplicate key error');

  section('Multikey index on an array: one index entry per element');
  const posts = db.collection('posts');
  await posts.insertMany([{ tags: ['node', 'mongo'] }, { tags: ['react'] }, { tags: ['mongo', 'sql'] }]);
  await posts.createIndex({ tags: 1 });
  const mk = await posts.find({ tags: 'mongo' }).explain('executionStats');
  const ixscan = JSON.stringify(mk.queryPlanner.winningPlan);
  assert.match(ixscan, /"isMultiKey":true/);
  assert.equal(mk.executionStats.nReturned, 2);
  console.log('tags: "mongo" -> 2 posts via a multikey IXSCAN');

  section('Text index with relevance score');
  const articles = db.collection('articles');
  await articles.insertMany([
    { title: 'Indexing in MongoDB', body: 'B-Tree indexes speed up queries' },
    { title: 'Cooking rice', body: 'water and patience' },
    { title: 'Query tuning', body: 'use an index; indexes avoid scans' },
  ]);
  await articles.createIndex({ title: 'text', body: 'text' });
  const hits = await articles
    .find({ $text: { $search: 'index' } }, { projection: { title: 1, score: { $meta: 'textScore' } } })
    .sort({ score: { $meta: 'textScore' } }).toArray();
  console.log(hits.map((h) => `${h.title} (${h.score.toFixed(2)})`));
  assert.equal(hits.length, 2); // stemming: "index", "indexes", "indexing" all match
  assert.ok(!hits.some((h) => h.title.includes('rice')));

  section('2dsphere: nearest places');
  const places = db.collection('places');
  await places.insertMany([
    { name: 'Sector 17', location: { type: 'Point', coordinates: [76.7794, 30.7412] } },
    { name: 'Mohali', location: { type: 'Point', coordinates: [76.7179, 30.7046] } },
    { name: 'Delhi', location: { type: 'Point', coordinates: [77.209, 28.6139] } },
  ]);
  await places.createIndex({ location: '2dsphere' });
  const near = await places.find({
    location: { $near: { $geometry: { type: 'Point', coordinates: [76.78, 30.74] }, $maxDistance: 20_000 } },
  }).toArray();
  console.log('within 20 km:', near.map((p) => p.name));
  assert.deepEqual(near.map((p) => p.name), ['Sector 17', 'Mohali']);

  section('TTL index: the server deletes expired documents itself');
  const sessions = db.collection('sessions');
  await sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 });
  await sessions.insertMany([
    { sid: 'old', createdAt: new Date(Date.now() - 2 * 3600_000) },
    { sid: 'fresh', createdAt: new Date() },
  ]);
  const t0 = Date.now();
  while ((await sessions.countDocuments()) > 1 && Date.now() - t0 < 15_000) await new Promise((r) => setTimeout(r, 250));
  const left = await sessions.find().toArray();
  console.log(`after ${Date.now() - t0} ms the TTL monitor left:`, left.map((s) => s.sid));
  assert.deepEqual(left.map((s) => s.sid), ['fresh']);

  section('Partial index: only "pending" orders are indexed');
  await orders.createIndex({ status: 1 }, { partialFilterExpression: { status: 'pending' }, name: 'pending_only' });
  const pending = await explain(orders.find({ status: 'pending' }));
  const paid = await explain(orders.find({ status: 'paid' }));
  console.log('status=pending:', pending.stages, '| status=paid:', paid.stages);
  assert.match(pending.stages, /IXSCAN/);
  assert.match(paid.stages, /COLLSCAN/); // the index cannot answer queries outside its filter
  const sizes = (await orders.aggregate([{ $collStats: { storageStats: {} } }]).toArray())[0].storageStats.indexSizes;
  console.log('index sizes (bytes):', sizes);
});
console.log('\nOK');
