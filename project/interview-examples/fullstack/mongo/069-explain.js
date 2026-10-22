// Topic 69: Query Optimization with explain()  (Full-Stack Handbook, Part 3)
// Run: npm run ex 69        (or: node 069-explain.js)
// What it shows: the same query under no index, a badly ordered index and an ESR-ordered index,
// comparing stage, keysExamined, docsExamined and nReturned; then the profiler catching a slow query.
import assert from 'node:assert/strict';
import { withMongo, section, planSummary } from './lib/db.js';

await withMongo({}, async ({ db }) => {
  const orders = db.collection('orders');
  const statuses = ['paid', 'pending', 'cancelled', 'refunded'];
  await orders.insertMany(Array.from({ length: 20000 }, (_, i) => ({
    userId: i % 200, status: statuses[Math.floor(i / 200) % 4], total: i % 1000, createdAt: new Date(2026, 0, 1, 0, i),
  })));
  // each user has 100 orders spread over the 4 statuses -> 25 match
  const expected = await orders.countDocuments({ userId: 42, status: 'cancelled' });

  const run = async (label) => {
    const e = await orders.find({ userId: 42, status: 'cancelled' }).sort({ createdAt: -1 }).explain('executionStats');
    const s = planSummary(e);
    console.log(label.padEnd(34), JSON.stringify(s));
    assert.equal(s.nReturned, expected);
    return s;
  };

  section('Query: { userId: 42, status: "cancelled" } sort { createdAt: -1 }');
  const none = await run('no index');
  assert.match(none.stages, /COLLSCAN/);
  assert.match(none.stages, /SORT/); // in-memory sort
  assert.equal(none.docsExamined, 20000);

  await orders.createIndex({ userId: 1 });
  const partial = await run('{ userId: 1 }');
  assert.match(partial.stages, /IXSCAN/);
  assert.ok(partial.docsExamined > partial.nReturned); // fetched docs, then filtered status in memory

  await orders.dropIndexes();
  await orders.createIndex({ createdAt: -1, userId: 1, status: 1 }); // Sort first: wrong order
  const wrong = await orders.find({ userId: 42, status: 'cancelled' }).sort({ createdAt: -1 })
    .hint({ createdAt: -1, userId: 1, status: 1 }).explain('executionStats').then(planSummary);
  console.log('{ createdAt, userId, status } (hint)'.padEnd(34), JSON.stringify(wrong));
  assert.equal(wrong.keysExamined, 20000); // walks the whole index to keep sort order

  await orders.dropIndexes();
  await orders.createIndex({ userId: 1, status: 1, createdAt: -1 }); // Equality, Equality, Sort
  const good = await run('{ userId, status, createdAt } ESR');
  assert.doesNotMatch(good.stages, /SORT|COLLSCAN/);
  assert.equal(good.keysExamined, good.nReturned);
  assert.equal(good.docsExamined, good.nReturned);
  console.log('healthy: keysExamined == docsExamined == nReturned ==', good.nReturned);

  section('Covered query: projection only uses indexed fields -> docsExamined 0');
  const covered = await orders.find({ userId: 42, status: 'cancelled' }, { projection: { _id: 0, userId: 1, status: 1, createdAt: 1 } })
    .explain('executionStats').then(planSummary);
  console.log(covered);
  assert.equal(covered.docsExamined, 0);
  assert.doesNotMatch(covered.stages, /FETCH/);

  section('Profiler: log operations slower than slowms');
  await db.command({ profile: 1, slowms: 0 }); // 0 so this demo records everything; use ~100 in prod
  await orders.find({ total: 999 }).toArray(); // unindexed field -> COLLSCAN
  await db.command({ profile: 0 });
  const slow = await db.collection('system.profile').find({ ns: 'shop.orders', op: 'query' }).sort({ ts: -1 }).limit(1).next();
  console.log({ planSummary: slow.planSummary, docsExamined: slow.docsExamined, millis: slow.millis });
  assert.equal(slow.planSummary, 'COLLSCAN');
  assert.equal(slow.docsExamined, 20000);
});
console.log('\nOK');
