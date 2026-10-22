// Topic 37: Parallel Query Execution  (Full-Stack Handbook, Part 2)
// Run: npm run ex 37       (or: node 037-parallel-query.js)
// What it shows: the planner producing the handbook's Finalize Aggregate -> Gather -> Partial
// Aggregate -> Parallel Seq Scan plan for a big COUNT, and not for a small OLTP lookup. PGlite runs
// in one process, so "Workers Launched: 0" - the leader does all the work; on a server the same
// plan fans out to background workers.
import assert from 'node:assert/strict';
import { createDb, all, explain, heading, show } from './lib/db.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE events (id SERIAL PRIMARY KEY, type TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL);
  INSERT INTO events (type, created_at)
    SELECT (ARRAY['click','view','view','scroll'])[1 + g % 4], timestamptz '2026-01-01' + g * interval '1 second'
    FROM generate_series(1, 400000) g;
  ANALYZE events;
`);

heading('Settings');
await db.query('SET max_parallel_workers_per_gather = 4');
const s = await all(db, `SELECT name, setting FROM pg_settings WHERE name IN
  ('max_parallel_workers_per_gather', 'max_parallel_workers', 'max_worker_processes', 'min_parallel_table_scan_size') ORDER BY name`);
s.forEach((r) => console.log(`    ${r.name.padEnd(32)} ${r.setting}`));

heading('Big aggregate: a parallel plan');
const big = await explain(db, `SELECT count(*) FROM events WHERE type = 'click'`, 'ANALYZE, TIMING OFF, COSTS OFF');
show('plan', big);
assert.match(big, /Finalize Aggregate/);
assert.match(big, /Gather/);
assert.match(big, /Parallel Seq Scan on events/);
show('workers', big.match(/Workers Planned: \d+/)[0] + ', ' + big.match(/Workers Launched: \d+/)[0]);

heading('Small OLTP lookup: no parallelism (startup cost not worth it)');
const small = await explain(db, 'SELECT * FROM events WHERE id = 42');
show('plan', small);
assert.doesNotMatch(small, /Gather/);

heading('max_parallel_workers_per_gather = 0 turns it off');
await db.query('SET max_parallel_workers_per_gather = 0');
const off = await explain(db, `SELECT count(*) FROM events WHERE type = 'click'`);
show('plan', off);
assert.doesNotMatch(off, /Gather/);

await db.close();
console.log('\nOK');
