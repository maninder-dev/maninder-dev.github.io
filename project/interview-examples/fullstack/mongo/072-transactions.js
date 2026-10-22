// Topic 72: Transactions in MongoDB  (Full-Stack Handbook, Part 3)
// Run: npm run ex 72        (or: node 072-transactions.js)
// What it shows: single-document updates are atomic without a transaction; a multi-document
// transfer with session.withTransaction() commits both writes or neither; uncommitted writes are
// invisible to other readers; and transactions fail on a standalone server.
import assert from 'node:assert/strict';
import { withMongo, section } from './lib/db.js';

async function transfer(client, accounts, from, to, amount) {
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const r = await accounts.findOneAndUpdate(
        { _id: from }, { $inc: { balance: -amount } }, { session, returnDocument: 'after' },
      );
      if (r.balance < 0) throw new Error(`Insufficient funds in ${from}`); // aborts the transaction
      await accounts.updateOne({ _id: to }, { $inc: { balance: amount } }, { session });
    }, { writeConcern: { w: 'majority' } });
  } finally {
    await session.endSession();
  }
}

await withMongo({ replSet: true }, async ({ client, db }) => {
  const accounts = db.collection('accounts');
  await accounts.insertMany([{ _id: 'A', balance: 300 }, { _id: 'B', balance: 0 }]);
  const balances = async () => Object.fromEntries((await accounts.find().sort({ _id: 1 }).toArray()).map((a) => [a._id, a.balance]));

  section('Single-document write: always atomic, no transaction needed');
  await accounts.updateOne({ _id: 'A' }, { $inc: { balance: 0 }, $set: { lastSeen: new Date() } });

  section('Transfer 100 A -> B: commits both updates');
  await transfer(client, accounts, 'A', 'B', 100);
  console.log(await balances());
  assert.deepEqual(await balances(), { A: 200, B: 100 });

  section('Transfer 500 A -> B: throws inside, everything rolls back');
  await assert.rejects(() => transfer(client, accounts, 'A', 'B', 500), /Insufficient funds/);
  console.log(await balances(), '(A was briefly -300 inside the transaction, never visible)');
  assert.deepEqual(await balances(), { A: 200, B: 100 });

  section('Isolation: outsiders do not see uncommitted writes');
  const s = client.startSession();
  s.startTransaction({ readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
  await accounts.updateOne({ _id: 'B' }, { $inc: { balance: 50 } }, { session: s });
  const inside = (await accounts.findOne({ _id: 'B' }, { session: s })).balance;
  const outside = (await accounts.findOne({ _id: 'B' })).balance;
  console.log({ insideTxn: inside, outsideTxn: outside });
  assert.equal(inside, 150);
  assert.equal(outside, 100);
  await s.commitTransaction();
  await s.endSession();
  assert.equal((await accounts.findOne({ _id: 'B' })).balance, 150);

  section('Time limit: transactionLifetimeLimitSeconds');
  const { transactionLifetimeLimitSeconds } = await db.admin().command({ getParameter: 1, transactionLifetimeLimitSeconds: 1 });
  console.log('server aborts transactions older than', transactionLifetimeLimitSeconds, 's -> keep them short');
  assert.equal(transactionLifetimeLimitSeconds, 60);
});

await withMongo({}, async ({ client, db }) => {
  section('Standalone server: transactions are not supported');
  const s = client.startSession();
  await assert.rejects(
    () => s.withTransaction(() => db.collection('x').insertOne({ a: 1 }, { session: s })),
    (e) => { console.log('standalone ->', e.message.slice(0, 70)); return /replica set|Transaction numbers|retryable writes/i.test(e.message); },
  );
  await s.endSession();
});
console.log('\nOK');
