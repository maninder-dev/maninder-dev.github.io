// Topic 68: Aggregation Pipeline  (Full-Stack Handbook, Part 3)
// Run: npm run ex 68        (or: node 068-aggregation-pipeline.js)
// What it shows: the handbook's "top customers by revenue" pipeline ($match $group $sort $limit
// $lookup $unwind $project), then $unwind on arrays, $facet, $bucket, $addFields and $merge.
import assert from 'node:assert/strict';
import { withMongo, section } from './lib/db.js';

await withMongo({}, async ({ db }) => {
  const users = db.collection('users');
  const orders = db.collection('orders');
  await users.insertMany([{ _id: 1, name: 'Asha' }, { _id: 2, name: 'Bilal' }, { _id: 3, name: 'Chen' }]);
  await orders.insertMany([
    { userId: 1, status: 'paid', total: 400, createdAt: new Date('2026-02-01'), items: [{ sku: 'A', qty: 2 }, { sku: 'B', qty: 1 }] },
    { userId: 1, status: 'paid', total: 100, createdAt: new Date('2026-03-01'), items: [{ sku: 'A', qty: 1 }] },
    { userId: 2, status: 'paid', total: 900, createdAt: new Date('2026-04-01'), items: [{ sku: 'C', qty: 3 }] },
    { userId: 2, status: 'cancelled', total: 5000, createdAt: new Date('2026-04-02'), items: [] },
    { userId: 3, status: 'paid', total: 50, createdAt: new Date('2025-12-31'), items: [{ sku: 'B', qty: 1 }] },
  ]);
  await orders.createIndex({ status: 1, createdAt: 1 }); // lets the leading $match use an index

  section('Top customers by revenue in 2026, with their names');
  const pipeline = [
    { $match: { status: 'paid', createdAt: { $gte: new Date('2026-01-01') } } },
    { $group: { _id: '$userId', revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    { $sort: { revenue: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $project: { _id: 0, name: '$user.name', revenue: 1, orders: 1 } },
  ];
  const top = await orders.aggregate(pipeline).toArray();
  console.table(top);
  assert.deepEqual(top, [{ revenue: 900, orders: 1, name: 'Bilal' }, { revenue: 500, orders: 2, name: 'Asha' }]);
  const plan = JSON.stringify(await orders.aggregate(pipeline).explain());
  assert.match(plan, /IXSCAN/); // $match first => index used
  console.log('explain: leading $match runs as an IXSCAN');

  section('$unwind an array: units sold per SKU');
  const perSku = await orders.aggregate([
    { $match: { status: 'paid' } },
    { $unwind: '$items' },
    { $group: { _id: '$items.sku', units: { $sum: '$items.qty' } } },
    { $sort: { _id: 1 } },
  ]).toArray();
  console.log(perSku);
  assert.deepEqual(perSku, [{ _id: 'A', units: 3 }, { _id: 'B', units: 2 }, { _id: 'C', units: 3 }]);

  section('$facet: several pipelines over the same input in one round trip');
  const [facets] = await orders.aggregate([
    { $facet: {
      byStatus: [{ $group: { _id: '$status', n: { $sum: 1 } } }, { $sort: { _id: 1 } }],
      priceBands: [{ $bucket: { groupBy: '$total', boundaries: [0, 100, 1000, Infinity], default: 'other', output: { n: { $sum: 1 } } } }],
      totals: [{ $match: { status: 'paid' } }, { $group: { _id: null, sum: { $sum: '$total' }, avg: { $avg: '$total' } } }],
    } },
  ]).toArray();
  console.log(JSON.stringify(facets));
  assert.deepEqual(facets.byStatus, [{ _id: 'cancelled', n: 1 }, { _id: 'paid', n: 4 }]);
  assert.deepEqual(facets.priceBands.map((b) => [b._id, b.n]), [[0, 1], [100, 3], [1000, 1]]);
  assert.equal(facets.totals[0].sum, 1450);

  section('$addFields + $merge: write a materialised summary collection');
  await orders.aggregate([
    { $match: { status: 'paid' } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue: { $sum: '$total' } } },
    { $addFields: { bigMonth: { $gte: ['$revenue', 500] } } },
    { $merge: { into: 'monthly_revenue', whenMatched: 'replace' } },
  ]).toArray();
  const monthly = await db.collection('monthly_revenue').find().sort({ _id: 1 }).toArray();
  console.table(monthly);
  assert.deepEqual(monthly.map((m) => m._id), ['2025-12', '2026-02', '2026-03', '2026-04']);
  assert.equal(monthly.find((m) => m._id === '2026-04').bigMonth, true);
});
console.log('\nOK');
