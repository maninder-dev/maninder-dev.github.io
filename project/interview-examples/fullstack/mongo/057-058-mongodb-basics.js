// Topic 57-58: What is MongoDB? / Why MongoDB over SQL?  (Full-Stack Handbook, Part 3)
// Run: npm run ex 57        (or: node 057-058-mongodb-basics.js)
// What it shows: documents with nested objects and arrays queried by dot-path and array match,
// and one "products" collection holding differently-shaped documents (no ALTER TABLE needed).
import assert from 'node:assert/strict';
import { withMongo, section } from './lib/db.js';

await withMongo({}, async ({ db }) => {
  section('57. A document with an embedded object and an array');
  const users = db.collection('users');
  await users.insertOne({
    name: 'Alice',
    email: 'alice@example.com',
    address: { city: 'Chandigarh', pin: '160017' },
    skills: ['node', 'react'],
  });
  await users.insertOne({ name: 'Bob', address: { city: 'Delhi' }, skills: ['go'] });

  // Dot-path reaches inside the embedded object; skills: 'node' matches any array element.
  const found = await users.find({ 'address.city': 'Chandigarh', skills: 'node' }).toArray();
  console.log('find by address.city + skills ->', found.map((u) => u.name));
  assert.deepEqual(found.map((u) => u.name), ['Alice']);
  // One read returned the whole aggregate: no JOIN to an addresses or skills table.
  assert.equal(found[0].address.pin, '160017');

  section('58. One collection, every product carries only its own fields');
  const products = db.collection('products');
  await products.insertMany([
    { name: 'MongoDB Book', price: 50, author: 'John', isbn: '123', pages: 400 },
    { name: 'MacBook', price: 2000, ram: '16GB', cpu: 'M2', screen: '14in' },
    { name: 'T-Shirt', price: 20, size: 'L', color: 'Blue' },
  ]);
  for (const p of await products.find({}, { projection: { _id: 0 } }).toArray()) {
    console.log(Object.keys(p).join(', '));
  }

  // Common fields still query across shapes; shape-specific fields only match where present.
  const cheap = await products.find({ price: { $lt: 100 } }).sort({ price: 1 }).toArray();
  assert.deepEqual(cheap.map((p) => p.name), ['T-Shirt', 'MongoDB Book']);
  assert.equal(await products.countDocuments({ ram: { $exists: true } }), 1);

  // A new attribute is just written; in SQL this is a migration (or a sparse JSONB column).
  await products.updateOne({ name: 'T-Shirt' }, { $set: { fabric: 'cotton' } });
  assert.equal((await products.findOne({ name: 'T-Shirt' })).fabric, 'cotton');
  console.log('added "fabric" to one product without any schema change');
});
console.log('\nOK');
