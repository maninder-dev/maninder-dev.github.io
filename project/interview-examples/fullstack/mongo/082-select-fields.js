// Topic 82: Over-fetching and Selecting Fields  (Full-Stack Handbook, Part 4)
// Run: npm run ex 82        (or: node 082-select-fields.js)
// What it shows: Drizzle's default select() fetches every column (including password_hash) while
// select({ id, name }) fetches two; Mongoose projection + lean(), and select:false hiding secrets
// unless a query explicitly asks for '+password'.
import assert from 'node:assert/strict';
import { startPg, withMongoose, section } from './lib/db.js';
import { schema, users, createTables, seed } from './lib/pg-schema.js';

const pg = await startPg(schema);
await createTables(pg.client);
await seed(pg.db, 200);

section('SQL ORM: SELECT * vs picked fields');
const all = await pg.count(() => pg.db.select().from(users));
const picked = await pg.count(() => pg.db.select({ id: users.id, name: users.name }).from(users));
// Prisma: findMany({ select: { id: true, name: true } })   Sequelize: findAll({ attributes: ['id', 'name'] })
console.log('default :', all.sql[0]);
console.log('picked  :', picked.sql[0]);
const bytes = (x) => Buffer.byteLength(JSON.stringify(x));
console.log(`payload: ${bytes(all.result)} B vs ${bytes(picked.result)} B`);
assert.ok('passwordHash' in all.result[0], 'default select leaks the hash to whoever serialises it');
assert.deepEqual(Object.keys(picked.result[0]), ['id', 'name']);
assert.ok(bytes(picked.result) < bytes(all.result) / 3);
await pg.stop();

await withMongoose({}, async ({ mongoose }) => {
  const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    email: String,
    bio: String,
    password: { type: String, select: false }, // hidden by default
  }));
  await User.insertMany(Array.from({ length: 2000 }, (_, i) => ({ name: `u${i}`, email: `u${i}@x.io`, bio: 'x'.repeat(500), password: 'hash' })));

  section('Mongoose: projection');
  const slim = await User.find({}, 'name email').limit(1);
  console.log(slim[0].toObject());
  assert.equal(slim[0].bio, undefined);

  section('Mongoose: select:false hides secrets, "+password" opts in');
  const normal = await User.findOne({ name: 'u1' });
  assert.equal(normal.password, undefined);
  const forLogin = await User.findOne({ name: 'u1' }).select('+password');
  assert.equal(forLogin.password, 'hash');
  console.log('findOne() password:', normal.password, '| .select("+password"):', forLogin.password);

  section('Mongoose: lean() returns plain objects');
  const time = async (fn) => { const t = performance.now(); const r = await fn(); return [r, performance.now() - t]; };
  await User.find().lean(); // warm up
  const [docs, tDocs] = await time(() => User.find({}, 'name email bio'));
  const [plain, tLean] = await time(() => User.find({}, 'name email bio').lean());
  console.log(`2000 docs: hydrated ${tDocs.toFixed(0)} ms, lean ${tLean.toFixed(0)} ms`);
  assert.ok(docs[0] instanceof mongoose.Document);
  assert.equal(Object.getPrototypeOf(plain[0]), Object.prototype);
  assert.equal(plain[0].save, undefined);
});
console.log('\nOK');
