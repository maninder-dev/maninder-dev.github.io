// Topic 59: BSON vs JSON  (Full-Stack Handbook, Part 3)
// Run: npm run ex 59        (or: node 059-bson-vs-json.js)
// What it shows: BSON keeps ObjectId, Date, Decimal128 and Int64 types through a round trip
// where JSON flattens them to strings/doubles; also decodes what is packed inside an ObjectId.
import assert from 'node:assert/strict';
import { ObjectId, Decimal128, Long, BSON } from 'mongodb';
import { withMongo, section } from './lib/db.js';

const doc = {
  _id: new ObjectId('6710a1f2c3b4a5d6e7f80912'),
  createdAt: new Date('2026-10-15T10:00:00Z'),
  price: Decimal128.fromString('19.99'),
  views: Long.fromString('1234567890123'),
};

section('ObjectId: 12 bytes = 4-byte timestamp + 5 random + 3-byte counter');
console.log('hex', doc._id.toHexString(), '-> created', doc._id.getTimestamp().toISOString());
assert.equal(doc._id.id.length, 12);
assert.equal(doc._id.getTimestamp().toISOString(), '2024-10-17T05:34:42.000Z');

section('JSON round trip loses the types');
const viaJson = JSON.parse(JSON.stringify(doc));
console.log(viaJson);
assert.equal(typeof viaJson.createdAt, 'string'); // Date -> string
assert.equal(typeof viaJson._id, 'string'); // ObjectId -> string
assert.deepEqual(viaJson.price, { $numberDecimal: '19.99' }); // driver's toJSON, not a number
assert.equal(0.1 + 0.2 === 0.3, false, 'why money must not be a double');

section('BSON round trip keeps them, and fields are length-prefixed');
const bytes = BSON.serialize(doc);
console.log('BSON bytes:', bytes.length, ' first 4 bytes = total length', bytes.readInt32LE(0));
assert.equal(bytes.readInt32LE(0), bytes.length); // a reader can skip a whole doc without parsing
const back = BSON.deserialize(bytes, { promoteLongs: false });
assert.ok(back._id instanceof ObjectId);
assert.ok(back.createdAt instanceof Date);
assert.equal(back.price.toString(), '19.99');
assert.equal(back.views.toString(), '1234567890123');

await withMongo({}, async ({ db }) => {
  section('Server-side types: $type sees the real BSON type');
  const c = db.collection('typed');
  await c.insertOne(doc);
  await c.insertOne({ createdAt: '2026-10-15T10:00:00Z', price: 19.99 }); // the "JSON" way
  const types = await c
    .aggregate([{ $project: { _id: 0, created: { $type: '$createdAt' }, price: { $type: '$price' } } }])
    .toArray();
  console.log(types);
  assert.deepEqual(types, [
    { created: 'date', price: 'decimal' },
    { created: 'string', price: 'double' },
  ]);
  // Date ranges only work on real dates: the string-dated doc is not matched.
  const n = await c.countDocuments({ createdAt: { $gte: new Date('2026-01-01') } });
  assert.equal(n, 1);
  // Decimal arithmetic is exact on the server.
  const [{ sum }] = await c
    .aggregate([{ $match: { _id: doc._id } }, { $project: { sum: { $add: ['$price', Decimal128.fromString('0.01')] } } }])
    .toArray();
  assert.equal(sum.toString(), '20.00');
  console.log('19.99 + 0.01 as Decimal128 =', sum.toString());
});
console.log('\nOK');
