// Topic 84: Connection Pooling in ORMs  (Full-Stack Handbook, Part 4)
// Run: npm run ex 84        (or: node 084-connection-pooling.js)
// What it shows: the MongoDB driver's pool (the one Mongoose uses) with maxPoolSize 2 vs 8 running
// 8 concurrent 100 ms queries: the pool never opens more than its max, extra requests wait in the
// queue, and wall time follows. Then the sizing rule: pool size x instances < server max connections.
// PGlite is a single in-process connection, so the pool demo uses MongoDB.
import assert from 'node:assert/strict';
import { MongoClient } from 'mongodb';
import { withMongo, section } from './lib/db.js';

await withMongo({}, async ({ uri, db }) => {
  await db.collection('jobs').insertOne({ _id: 1 });

  async function burst(maxPoolSize) {
    const client = new MongoClient(uri, { maxPoolSize, minPoolSize: 0 });
    let created = 0;
    let waitedMax = 0;
    const started = new Map();
    client.on('connectionCreated', () => created++);
    client.on('connectionCheckOutStarted', (e) => started.set(e, performance.now()));
    client.on('connectionCheckedOut', () => {
      const first = started.keys().next().value;
      waitedMax = Math.max(waitedMax, performance.now() - started.get(first));
      started.delete(first);
    });
    await client.connect();
    const jobs = client.db('shop').collection('jobs');
    const t0 = performance.now();
    // $where with sleep(): each query holds its connection for ~100 ms on the server.
    await Promise.all(Array.from({ length: 8 }, () => jobs.find({ $where: 'sleep(100) || true' }).toArray()));
    const ms = performance.now() - t0;
    await client.close();
    return { maxPoolSize, connectionsCreated: created, wallMs: Math.round(ms), longestWaitMs: Math.round(waitedMax) };
  }

  section('8 concurrent 100 ms queries');
  const small = await burst(2);
  const big = await burst(8);
  console.table([small, big]);
  assert.ok(small.connectionsCreated <= 2, 'never more than maxPoolSize');
  assert.ok(big.connectionsCreated > 2);
  assert.ok(small.wallMs >= 350, '8 queries / 2 connections = 4 waves of ~100 ms');
  assert.ok(big.wallMs < small.wallMs);
  assert.ok(small.longestWaitMs > big.longestWaitMs, 'requests queued for a free connection');

  section('Size it for the database, not the app');
  const { connections } = await db.admin().command({ serverStatus: 1 });
  console.log('server connections: current', connections.current, '| available', connections.available);
  const appInstances = 20;
  const poolSize = 10;
  const total = appInstances * poolSize;
  console.log(`${appInstances} instances x pool ${poolSize} = ${total} connections (PostgreSQL default max_connections is 100!)`);
  assert.ok(total > 100, 'this config would exhaust a default PostgreSQL -> use PgBouncer / RDS Proxy');
});

/* Pool settings in each library:
   new Sequelize(DB_URL, { pool: { max: 10, min: 2, acquire: 30000, idle: 10000 } });
   DATABASE_URL="postgresql://...?connection_limit=10&pool_timeout=20"        // Prisma
   drizzle(new pg.Pool({ connectionString, max: 10, idleTimeoutMillis: 10000 })) // Drizzle + node-postgres
   mongoose.connect(uri, { maxPoolSize: 10 });                                  // Mongoose
*/
console.log('\nOK');
