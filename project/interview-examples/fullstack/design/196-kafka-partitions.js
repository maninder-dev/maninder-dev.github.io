// Topic 196: Kafka vs RabbitMQ vs SQS  (Full-Stack Handbook, Part 10)
// Run: npm run ex 196        (or: node 196-kafka-partitions.js)
// What it shows: a simulation (no broker) of why Kafka keys matter. Messages are routed to a partition
// by hash(key) % partitions, each partition is consumed in order by one consumer, so all events for one
// order stay in order. A shared work queue with competing consumers can reorder them. Kafka's log is
// also replayable: a new consumer group reads from offset 0.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { sleep } from './lib.js';

// Kafka's default partitioner uses murmur2; any stable hash shows the idea.
const partitionFor = (key, n) => createHash('md5').update(key).digest().readUInt32BE(0) % n;

class Topic {
  constructor(partitions) { this.partitions = Array.from({ length: partitions }, () => []); }
  send({ key, value }) { const p = partitionFor(key, this.partitions.length); this.partitions[p].push({ key, value, offset: this.partitions[p].length }); return p; }
}

// Events for 4 orders, each with a strict lifecycle.
const lifecycle = ['created', 'paid', 'shipped', 'delivered'];
const events = [];
for (const step of lifecycle) for (const id of ['A', 'B', 'C', 'D']) events.push({ key: `order-${id}`, value: step });

// Uneven processing time (one slow message, e.g. a slow DB write) is what reorders things across consumers.
// Fast messages yield with setImmediate (no timer), so the result doesn't depend on machine load.
const work = (msg) => (msg.key === 'order-A' && msg.value === 'created' ? sleep(100) : new Promise((r) => setImmediate(r)));

// --- Kafka-style: 3 partitions, one consumer per partition, sequential within a partition. ---
const topic = new Topic(3);
const routing = {};
for (const e of events) routing[e.key] = topic.send(e);
console.log('key -> partition:', routing);

const seenKafka = {};
await Promise.all(topic.partitions.map(async (log) => {
  for (const msg of log) { await work(msg); (seenKafka[msg.key] ??= []).push(msg.value); }
}));
for (const [key, seq] of Object.entries(seenKafka)) assert.deepEqual(seq, lifecycle, `${key} processed in order`);
console.log('kafka-style  order-A:', seenKafka['order-A'].join(' > '));

// --- Shared queue, 3 competing consumers (RabbitMQ/SQS standard queue without grouping). ---
const queue = [...events];
const seen = {};
await Promise.all([1, 2, 3].map(async () => {
  while (queue.length) { const msg = queue.shift(); await work(msg); (seen[msg.key] ??= []).push(msg.value); }
}));
console.log('shared queue order-A:', seen['order-A'].join(' > '));
assert.notDeepEqual(seen['order-A'], lifecycle, 'competing consumers reorder events for the same key');
assert.notEqual(seen['order-A'][0], 'created', 'a later event (paid) was handled before "created"');

// --- Replay: Kafka keeps the log, so a new consumer group can rebuild state from offset 0. ---
const projection = {};
for (const log of topic.partitions) for (const m of log) projection[m.key] = m.value;
assert.deepEqual(Object.values(projection), ['delivered', 'delivered', 'delivered', 'delivered']);
console.log('replayed from offset 0 into a new read model:', projection);

// The same key always maps to the same partition (until you change the partition count!).
assert.equal(partitionFor('order-A', 3), partitionFor('order-A', 3));
const moved = ['order-A', 'order-B', 'order-C', 'order-D'].filter((k) => partitionFor(k, 3) !== partitionFor(k, 4));
console.log('keys that move if partitions go 3 -> 4:', moved.length ? moved.join(', ') : 'none (lucky)');
console.log('OK: per-key ordering comes from key -> partition, not from the broker globally');
