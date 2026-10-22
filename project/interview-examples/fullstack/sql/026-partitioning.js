// Topic 26: Partitioning Strategies  (Full-Stack Handbook, Part 2)
// Run: npm run ex 26       (or: node 026-partitioning.js)
// What it shows: a range-partitioned events table (one partition per month). A query on one month
// touches one partition (partition pruning); dropping an old month is instant compared to DELETE.
// Also list and hash partitioning.
import assert from 'node:assert/strict';
import { createDb, all, one, explain, heading, show, timeIt } from './lib/db.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE events (id BIGSERIAL, created_at TIMESTAMPTZ NOT NULL, payload JSONB) PARTITION BY RANGE (created_at);
  CREATE TABLE events_2026_07 PARTITION OF events FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
  CREATE TABLE events_2026_08 PARTITION OF events FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
  CREATE TABLE events_2026_09 PARTITION OF events FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
  CREATE TABLE events_2026_10 PARTITION OF events FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
  INSERT INTO events (created_at, payload)
    SELECT timestamptz '2026-07-01' + g * interval '1 minute', jsonb_build_object('n', g)
    FROM generate_series(0, 150000) g;
  ANALYZE events;
`);

heading('Rows were routed to partitions automatically');
const perPart = await all(db, `SELECT tableoid::regclass::text AS partition, count(*)::int FROM events GROUP BY 1 ORDER BY 1`);
perPart.forEach((r) => console.log('   ', r));
assert.equal(perPart.length, 4);

heading('Partition pruning: only October is scanned');
const plan = await explain(db, `SELECT count(*) FROM events WHERE created_at >= '2026-10-01' AND created_at < '2026-10-08'`);
show('plan', plan);
assert.match(plan, /events_2026_10/);
assert.doesNotMatch(plan, /events_2026_0[789]/);

heading('Archiving: DROP a partition vs DELETE rows');
await db.exec(`CREATE TABLE events_flat AS SELECT * FROM events`);
const delMs = await timeIt(() => db.query(`DELETE FROM events_flat WHERE created_at < '2026-08-01'`));
const dropMs = await timeIt(() => db.query('DROP TABLE events_2026_07'));
show('ms DELETE a month vs DROP its partition', `${delMs.toFixed(1)} vs ${dropMs.toFixed(1)}`);
assert.ok(dropMs < delMs);
assert.equal((await one(db, `SELECT count(*)::int AS n FROM events WHERE created_at < '2026-08-01'`)).n, 0);

heading('Inserting outside every range fails - add the next partition ahead of time');
const err = await db.query(`INSERT INTO events (created_at) VALUES ('2026-12-25')`).catch((e) => e);
show('error', err.message);
assert.match(err.message, /no partition/);

heading('List and hash partitioning');
await db.exec(`
  CREATE TABLE customers (id INT, region TEXT) PARTITION BY LIST (region);
  CREATE TABLE customers_eu PARTITION OF customers FOR VALUES IN ('DE', 'FR');
  CREATE TABLE customers_asia PARTITION OF customers FOR VALUES IN ('IN', 'JP');
  CREATE TABLE sessions (user_id INT) PARTITION BY HASH (user_id);
  CREATE TABLE sessions_0 PARTITION OF sessions FOR VALUES WITH (MODULUS 2, REMAINDER 0);
  CREATE TABLE sessions_1 PARTITION OF sessions FOR VALUES WITH (MODULUS 2, REMAINDER 1);
  INSERT INTO customers VALUES (1, 'IN'), (2, 'DE');
  INSERT INTO sessions SELECT g FROM generate_series(1, 1000) g;
`);
show('IN customer lives in', (await one(db, `SELECT tableoid::regclass::text AS p FROM customers WHERE region = 'IN'`)).p);
const hashSplit = await all(db, `SELECT tableoid::regclass::text AS p, count(*)::int FROM sessions GROUP BY 1 ORDER BY 1`);
show('hash split of 1000 users', hashSplit);
assert.ok(hashSplit.every((r) => r.count > 400));

await db.close();
console.log('\nOK');
