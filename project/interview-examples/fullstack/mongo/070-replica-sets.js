// Topic 70: Replica Sets (Reliability)  (Full-Stack Handbook, Part 3; failover also answers 218)
// Run: npm run ex 70        (or: node 070-replica-sets.js)
// What it shows: a real 3-member replica set (three local mongod processes): member states,
// a w:"majority" write, a secondary read, then rs.stepDown() and the driver finding the new primary.
// Real elections, but all members are on one machine, so there is no network partition to test.
import assert from 'node:assert/strict';
import { withMongo, section } from './lib/db.js';

const members = async (client) => (await client.db('admin').command({ replSetGetStatus: 1 })).members
  .map((m) => [m.name, m.stateStr]);
const primaryOf = async (client) => (await client.db('admin').command({ hello: 1 })).primary;

await withMongo({ replSet: 3, clientOptions: { retryWrites: true } }, async ({ client, db, uri }) => {
  section('rs.status(): one PRIMARY, two SECONDARY');
  // Wait until both secondaries finished initial sync.
  for (let i = 0; i < 60; i++) {
    const states = (await members(client)).map(([, s]) => s).sort().join();
    if (states === 'PRIMARY,SECONDARY,SECONDARY') break;
    await new Promise((r) => setTimeout(r, 250));
  }
  const before = await members(client);
  console.log(before);
  assert.deepEqual(before.map(([, s]) => s).sort(), ['PRIMARY', 'SECONDARY', 'SECONDARY']);
  console.log('connection string:', uri.replace(/\/\?.*$/, '/?replicaSet=...'));

  section('Durable write: acknowledged by a majority');
  const payments = db.collection('payments');
  const res = await payments.insertOne({ _id: 1, amount: 500 }, { writeConcern: { w: 'majority', wtimeoutMS: 5000 } });
  assert.equal(res.acknowledged, true);
  console.log('w:"majority" insert acknowledged');

  section('Read from a secondary (may be slightly stale)');
  await payments.insertOne({ _id: 2, amount: 70 }, { writeConcern: { w: 3 } }); // wait for every member
  const fromSecondary = await payments.find({}, { readPreference: 'secondary' }).explain();
  const servedBy = fromSecondary.serverInfo ?? fromSecondary.queryPlanner?.serverInfo;
  const n = await payments.countDocuments({}, { readPreference: 'secondary' });
  console.log(`secondary ${servedBy?.host}:${servedBy?.port} sees ${n} payments`);
  assert.equal(n, 2);
  // Writes to a secondary are refused.
  const secondaryHost = before.find(([, s]) => s === 'SECONDARY')[0];
  const { MongoClient } = await import('mongodb');
  const direct = await new MongoClient(`mongodb://${secondaryHost}/?directConnection=true`).connect();
  await assert.rejects(() => direct.db('shop').collection('payments').insertOne({ amount: 1 }), (e) => {
    console.log('direct write to secondary ->', e.codeName);
    return e.codeName === 'NotWritablePrimary';
  });
  await direct.close();

  section('Failover: rs.stepDown() on the primary');
  const oldPrimary = await primaryOf(client);
  const t0 = Date.now();
  await client.db('admin').command({ replSetStepDown: 30, secondaryCatchUpPeriodSecs: 5 }).catch(() => {});
  let newPrimary;
  while (Date.now() - t0 < 30_000) {
    newPrimary = await primaryOf(client).catch(() => undefined);
    if (newPrimary && newPrimary !== oldPrimary) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(`primary ${oldPrimary} -> ${newPrimary} in ${Date.now() - t0} ms`);
  assert.ok(newPrimary && newPrimary !== oldPrimary);

  // The same client keeps working: it rediscovers the primary and retries the write once.
  await payments.insertOne({ _id: 3, amount: 10 }, { writeConcern: { w: 'majority' } });
  assert.equal(await payments.countDocuments(), 3);
  console.log(await members(client));
  console.log('app wrote through the new primary with no reconfiguration');
});
console.log('\nOK');
