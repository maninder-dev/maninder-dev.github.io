// Topic 62: How MongoDB Stores Data Internally  (Full-Stack Handbook, Part 3)
// Run: npm run ex 62        (or: node 062-storage-internals.js)
// What it shows: the real dbPath of the in-memory server: one .wt file per collection and per
// index, the journal directory, internal RecordIds, and a checkpoint forced with fsync.
import assert from 'node:assert/strict';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { withMongo, section } from './lib/db.js';

await withMongo({}, async ({ server, db }) => {
  const orders = db.collection('orders');
  await orders.insertMany(Array.from({ length: 20000 }, (_, i) => ({ userId: i % 50, total: i, status: 'pending-payment', note: 'standard delivery, leave at the door' })));
  await orders.createIndex({ userId: 1 });

  section('Which WiredTiger file holds what');
  const [stats] = await orders.aggregate([{ $collStats: { storageStats: {} } }]).toArray();
  const collFile = stats.storageStats.wiredTiger.uri.replace('statistics:table:', '');
  const indexFiles = Object.fromEntries(
    Object.entries(stats.storageStats.indexDetails).map(([name, d]) => [name, d.uri.replace('statistics:table:', '')]),
  );
  console.log('shop.orders documents ->', collFile + '.wt');
  console.log('indexes                ->', indexFiles);
  assert.match(collFile, /^collection-/);
  assert.deepEqual(Object.keys(indexFiles).sort(), ['_id_', 'userId_1']); // every index is its own B-Tree
  assert.ok(Object.values(indexFiles).every((f) => f.startsWith('index-')));

  section('The files on disk (dbPath of the in-memory server)');
  await db.admin().command({ fsync: 1 }); // force a checkpoint so files are flushed
  const dbPath = server.instanceInfo.dbPath;
  const files = readdirSync(dbPath);
  const wt = files.filter((f) => f.endsWith('.wt'));
  console.log(dbPath);
  console.log(' ', wt.filter((f) => f.startsWith('collection-')).length, 'collection-*.wt,',
    wt.filter((f) => f.startsWith('index-')).length, 'index-*.wt, plus', files.filter((f) => /^WiredTiger/.test(f)).join(', '));
  assert.ok(files.includes(`${collFile}.wt`));
  assert.ok(files.includes(`${indexFiles.userId_1}.wt`));
  assert.ok(files.includes('WiredTiger.wt')); // metadata: which table lives in which file
  assert.ok(existsSync(join(dbPath, 'journal'))); // write-ahead log for crash recovery
  console.log('  journal/:', readdirSync(join(dbPath, 'journal')).slice(0, 3));

  section('Documents are addressed by an internal RecordId, not by _id');
  const withIds = await orders.find({}, { showRecordId: true, projection: { total: 1 } }).limit(3).toArray();
  console.log(withIds.map((d) => ({ total: d.total, $recordId: d.$recordId })));
  assert.ok(withIds.every((d) => d.$recordId != null));
  // Index entries map key -> RecordId; the collection B-Tree maps RecordId -> compressed document.

  section('Compression and checkpoints');
  assert.match(stats.storageStats.wiredTiger.creationString, /block_compressor=snappy/);
  const gen = async () => {
    const wt = (await db.admin().command({ serverStatus: 1 })).wiredTiger;
    return wt.checkpoint?.generation ?? wt.transaction['transaction checkpoint generation']; // 8.x vs 7.0 key
  };
  const before = await gen();
  await orders.insertOne({ userId: 999, total: 1 });
  await db.admin().command({ fsync: 1 }); // forces a checkpoint (normally every 60 s)
  const after = await gen();
  console.log('checkpoint generation', before, '->', after, 'after fsync');
  assert.ok(after > before);
  const [{ storageStats: ss }] = await orders.aggregate([{ $collStats: { storageStats: {} } }]).toArray();
  console.log('orders: data size', ss.size, 'bytes uncompressed, file', ss.storageSize, 'bytes on disk (snappy)');
  assert.ok(ss.storageSize < ss.size, 'repetitive documents compress');
});
console.log('\nOK');
