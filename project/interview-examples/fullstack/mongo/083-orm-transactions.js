// Topic 83: Transactions with ORMs  (Full-Stack Handbook, Part 4)
// Run: npm run ex 83        (or: node 083-orm-transactions.js)
// What it shows: Drizzle's managed transaction (PGlite) commits on success and rolls back when the
// callback throws (insufficient funds), plus an explicit tx.rollback(); then Mongoose's
// connection.transaction() on a single-node replica set. Sequelize/Prisma forms are in comments.
import assert from 'node:assert/strict';
import { eq, sql } from 'drizzle-orm';
import { startPg, withMongoose, section } from './lib/db.js';
import { schema, users, accounts, createTables } from './lib/pg-schema.js';

const pg = await startPg(schema);
const { db } = pg;
await createTables(pg.client);
const balances = async () => (await db.select().from(accounts).orderBy(accounts.id)).map((a) => a.balance);

section('Managed transaction: create user + account together');
// Sequelize: await sequelize.transaction(async (t) => { await User.create(..., { transaction: t }); ... });
await db.transaction(async (tx) => {
  const [u] = await tx.insert(users).values({ name: 'Alice', email: 'alice@x.io' }).returning();
  await tx.insert(accounts).values([{ userId: u.id, balance: 1000 }, { userId: u.id, balance: 0 }]);
});
console.log('balances', await balances());
assert.deepEqual(await balances(), [1000, 0]);

// Prisma: await prisma.$transaction(async (tx) => { ...decrement...; if (from.balance < 0) throw ...; ... });
async function transfer(from, to, amount) {
  await db.transaction(async (tx) => {
    const [src] = await tx.update(accounts).set({ balance: sql`${accounts.balance} - ${amount}` }).where(eq(accounts.id, from)).returning();
    if (src.balance < 0) throw new Error('Insufficient funds'); // -> ROLLBACK
    await tx.update(accounts).set({ balance: sql`${accounts.balance} + ${amount}` }).where(eq(accounts.id, to));
  });
}

section('Transfer 100: COMMIT');
await transfer(1, 2, 100);
assert.deepEqual(await balances(), [900, 100]);
console.log('balances', await balances());

section('Transfer 5000: throws inside -> ROLLBACK');
await assert.rejects(() => transfer(1, 2, 5000), /Insufficient funds/);
console.log('balances', await balances(), '(the debit to -4100 was undone)');
assert.deepEqual(await balances(), [900, 100]);

section('Explicit tx.rollback()');
await assert.rejects(() => db.transaction(async (tx) => {
  await tx.delete(accounts);
  tx.rollback();
}), /Rollback/i);
assert.equal((await balances()).length, 2);
console.log('delete inside rolled-back transaction did not happen');
await pg.stop();

section('Mongoose: connection.transaction() (needs a replica set)');
await withMongoose({ replSet: true }, async ({ mongoose }) => {
  const Order = mongoose.model('Order', new mongoose.Schema({ userId: Number, total: Number }));
  const Product = mongoose.model('Product', new mongoose.Schema({ _id: String, stock: { type: Number, min: 0 } }));
  await Order.createCollection();
  await Product.create({ _id: 'p1', stock: 1 });

  const buy = () => mongoose.connection.transaction(async (session) => {
    await Order.create([{ userId: 1, total: 99 }], { session });
    const p = await Product.findOneAndUpdate({ _id: 'p1' }, { $inc: { stock: -1 } }, { session, returnDocument: 'after' });
    if (p.stock < 0) throw new Error('Out of stock');
  });

  await buy();
  await assert.rejects(buy, /Out of stock/);
  const [orders, stock] = [await Order.countDocuments(), (await Product.findById('p1')).stock];
  console.log({ orders, stock });
  assert.deepEqual({ orders, stock }, { orders: 1, stock: 0 }); // second order rolled back with the stock change
});
console.log('\nOK');
