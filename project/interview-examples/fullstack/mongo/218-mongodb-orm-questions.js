// Topic 218: MongoDB and ORM Questions  (Full-Stack Handbook, Part 11)
// Run: npm run ex 218       (or: node 218-mongodb-orm-questions.js)
// What it shows: one runnable answer per question - embed vs reference (how fast embedded comments
// hit 16 MB), the ESR rule proven with explain(), skipping the ORM for a bulk UPDATE, and lean().
// Replica-set failover (rs.stepDown and the driver reconnecting) runs for real in 070-replica-sets.js.
import assert from 'node:assert/strict';
import { BSON } from 'mongodb';
import { sql } from 'drizzle-orm';
import { withMongoose, startPg, section, planSummary } from './lib/db.js';
import { schema, orders, createTables } from './lib/pg-schema.js';

await withMongoose({}, async ({ mongoose, db }) => {
  section('Q. Embed or reference?');
  const comment = { _id: new BSON.ObjectId(), author: 'bob', text: 'Nice post! '.repeat(20), at: new Date() };
  const perComment = BSON.calculateObjectSize({ 0: comment }) - 5;
  const fit = Math.floor((16 * 1024 * 1024) / perComment);
  console.log(`one comment ~${perComment} B -> only ~${fit.toLocaleString()} fit in a 16 MB post; a viral post gets 2,000,000`);
  assert.ok(fit < 2_000_000);
  await db.collection('orders').insertOne({ _id: 1, userId: 7, items: [{ sku: 'A1', qty: 2, price: 499 }], total: 998 }); // embed: bounded, owned
  await db.collection('comments').createIndex({ postId: 1 }); // reference: unbounded, indexed on postId

  section("Q. What's the ESR rule?");
  const o = db.collection('esr_orders');
  await o.insertMany(Array.from({ length: 10000 }, (_, i) => ({ status: ['paid', 'pending'][i % 2], total: i % 3000, createdAt: new Date(2026, 0, 1, 0, i) })));
  const q = () => o.find({ status: 'paid', total: { $gt: 1000 } }).sort({ createdAt: -1 });
  await o.createIndex({ status: 1, total: 1, createdAt: -1 }, { name: 'ERS' }); // range before sort
  await o.createIndex({ status: 1, createdAt: -1, total: 1 }, { name: 'ESR' });
  const ers = planSummary(await q().hint('ERS').explain('executionStats'));
  const esr = planSummary(await q().hint('ESR').explain('executionStats'));
  console.log('E,R,S:', ers);
  console.log('E,S,R:', esr);
  assert.match(ers.stages, /SORT/); // in-memory sort of every matching doc
  assert.doesNotMatch(esr.stages, /SORT/); // IXSCAN already in createdAt order
  assert.equal(esr.nReturned, ers.nReturned);

  section('Q. What does Mongoose lean() do?');
  const Product = mongoose.model('Product', new mongoose.Schema({ name: String, active: Boolean, price: Number }));
  await Product.insertMany(Array.from({ length: 3000 }, (_, i) => ({ name: `p${i}`, active: true, price: i })));
  await Product.find({ active: true }).lean(); // warm up
  let t = performance.now();
  const docs = await Product.find({ active: true });
  const tDocs = performance.now() - t;
  t = performance.now();
  const plain = await Product.find({ active: true }).lean();
  const tLean = performance.now() - t;
  console.log(`3000 docs: full documents ${tDocs.toFixed(0)} ms, lean ${tLean.toFixed(0)} ms`);
  assert.equal(typeof docs[0].save, 'function');
  assert.equal(plain[0].save, undefined); // plain object: ideal for res.json()
});

section("Q. Why might you skip the ORM? (bulk update in one statement)");
const pg = await startPg(schema);
await createTables(pg.client);
await pg.client.exec(`INSERT INTO orders (user_id, status, total, created_at)
  SELECT g % 100, 'pending', 10, now() - (g % 3) * interval '1 day' - interval '1 hour' FROM generate_series(1, 30000) g`);
// ORM-style would be: load 20k models, mutate, save each -> 20k round trips. Instead:
const res = await pg.count(() => pg.db.execute(sql`
  UPDATE ${orders} SET status = 'expired'
  WHERE status = 'pending' AND created_at < now() - interval '1 day'`));
console.log(`expired ${res.result.affectedRows} orders with ${res.n} statement`);
assert.equal(res.n, 1);
assert.equal(res.result.affectedRows, 20000);
await pg.stop();
console.log('\nOK');
