// Topic 64-65: What is WiredTiger? / How MongoDB Handles Memory  (Full-Stack Handbook, Part 3)
// Run: npm run ex 64        (or: node 064-065-wiredtiger-and-memory.js)
// What it shows: WiredTiger is the engine, snappy vs zstd compression on real data, document-level
// concurrency (two transactions on different docs both commit; on the same doc one gets a
// WriteConflict), the configured cache size, and the memory numbers you watch in production.
import assert from 'node:assert/strict';
import { withMongo, section } from './lib/db.js';

const status = (db) => db.admin().command({ serverStatus: 1 });
const storage = async (c) => (await c.aggregate([{ $collStats: { storageStats: {} } }]).toArray())[0].storageStats;

// Single-node replica set (transactions need one) with the cache capped at 1 GB.
await withMongo({ replSet: true, args: ['--wiredTigerCacheSizeGB', '1'] }, async ({ client, db }) => {
  section('64. Storage engine and cache size');
  const s = await status(db);
  console.log('engine:', s.storageEngine.name, '| cache max:', s.wiredTiger.cache['maximum bytes configured'] / 2 ** 20, 'MB');
  assert.equal(s.storageEngine.name, 'wiredTiger');
  assert.equal(s.wiredTiger.cache['maximum bytes configured'], 1024 * 2 ** 20); // default is ~50% of (RAM - 1 GB)

  section('64. Compression: snappy (default) vs zstd');
  await db.createCollection('logs_zstd', { storageEngine: { wiredTiger: { configString: 'block_compressor=zstd' } } });
  const rows = Array.from({ length: 30000 }, (_, i) => ({ level: i % 7 ? 'info' : 'warn', msg: `user ${i % 300} viewed product page`, at: new Date(2026, 0, 1, 0, 0, i) }));
  await db.collection('logs_snappy').insertMany(rows.map((r) => ({ ...r })));
  await db.collection('logs_zstd').insertMany(rows.map((r) => ({ ...r })));
  await db.admin().command({ fsync: 1 });
  const sn = await storage(db.collection('logs_snappy'));
  const zs = await storage(db.collection('logs_zstd'));
  console.log(`raw ${sn.size} B | snappy ${sn.storageSize} B | zstd ${zs.storageSize} B`);
  assert.match(sn.wiredTiger.creationString, /block_compressor=snappy/);
  assert.match(zs.wiredTiger.creationString, /block_compressor=zstd/);
  assert.ok(sn.storageSize < sn.size && zs.storageSize < sn.storageSize, 'zstd smaller than snappy smaller than raw');

  section('64. Document-level concurrency');
  const acc = db.collection('accounts');
  await acc.insertMany([{ _id: 'A', bal: 100 }, { _id: 'B', bal: 100 }]);
  const s1 = client.startSession();
  const s2 = client.startSession();
  s1.startTransaction();
  s2.startTransaction();
  await acc.updateOne({ _id: 'A' }, { $inc: { bal: -10 } }, { session: s1 });
  await acc.updateOne({ _id: 'B' }, { $inc: { bal: -10 } }, { session: s2 }); // different doc: no blocking
  await s1.commitTransaction();
  await s2.commitTransaction();
  console.log('two writers on different documents: both committed');

  s1.startTransaction();
  s2.startTransaction();
  await acc.updateOne({ _id: 'A' }, { $inc: { bal: -1 } }, { session: s1 });
  await assert.rejects(() => acc.updateOne({ _id: 'A' }, { $inc: { bal: -1 } }, { session: s2 }), (e) => {
    console.log('second writer on the SAME document ->', e.codeName, '(labels:', e.errorLabels?.join(','), ')');
    return e.codeName === 'WriteConflict';
  });
  await s1.commitTransaction();
  await s2.abortTransaction().catch(() => {});
  await s1.endSession();
  await s2.endSession();
  assert.deepEqual(await acc.find().sort({ _id: 1 }).toArray(), [{ _id: 'A', bal: 89 }, { _id: 'B', bal: 90 }]);

  section('65. Memory: what to watch');
  const st = await db.command({ dbStats: 1 });
  const s2s = await status(db);
  const cache = s2s.wiredTiger.cache;
  console.log({
    'indexSize (should fit in RAM)': st.indexSize,
    'dataSize': st.dataSize,
    'mem.resident MB': s2s.mem.resident,
    'bytes currently in the cache': cache['bytes currently in the cache'],
    'pages read into cache': cache['pages read into cache'],
  });
  assert.ok(cache['bytes currently in the cache'] <= cache['maximum bytes configured']);
  assert.ok(st.indexSize > 0 && s2s.mem.resident > 0);

  // Everything we inserted is still in the cache, so no disk reads were needed. In production,
  // "pages read into cache" climbing steadily while latency rises means the working set
  // (hot documents + indexes) no longer fits in RAM.
  assert.ok(cache['pages read into cache'] < 100);
});
console.log('\nOK');
