// Topics 31-32: VACUUM - Why It's Needed; Autovacuum  (Full-Stack Handbook, Part 2)
// Run: npm run ex 31       (or: node 031-032-vacuum-autovacuum.js)
// What it shows: updates leave dead tuples and the table grows; plain VACUUM makes that space
// reusable (the next update round doesn't grow the file); VACUUM FULL rewrites and shrinks it.
// Then per-table autovacuum settings and the trigger formula 50 + 20% of rows.
import assert from 'node:assert/strict';
import { createDb, one, heading, show } from './lib/db.js';

const db = await createDb();
await db.exec(`CREATE TABLE orders (id INT PRIMARY KEY, status TEXT, note TEXT) WITH (autovacuum_enabled = off);
               INSERT INTO orders SELECT g, 'paid', repeat('x', 100) FROM generate_series(1, 20000) g;`);
const size = async () => (await one(db, `SELECT pg_relation_size('orders')::int AS b`)).b;
const kb = (b) => `${Math.round(b / 1024)} kB`;
const updateAll = () => db.query(`UPDATE orders SET status = CASE status WHEN 'paid' THEN 'shipped' ELSE 'paid' END`);

heading('Updates without VACUUM: every round adds a full copy of the table');
const s0 = await size();
await updateAll();
const s1 = await size();
await updateAll();
const s2 = await size();
show('size: initial / after 1 update / after 2 updates', [s0, s1, s2].map(kb).join(' / '));
assert.ok(s2 > s1 && s1 > s0 * 1.8);

heading('VACUUM orders: dead space becomes reusable (file size unchanged, no exclusive lock)');
await db.query('VACUUM orders');
const s3 = await size();
await updateAll();
const s4 = await size();
show('size: after VACUUM / after another full update', `${kb(s3)} / ${kb(s4)}`);
assert.ok(s4 <= s2 * 1.05, 'the new versions reused the freed space instead of growing the file');

heading('VACUUM FULL orders: rewrite the table, give space back to the OS (takes ACCESS EXCLUSIVE)');
await db.query('VACUUM FULL orders');
const s5 = await size();
show('size after VACUUM FULL', kb(s5));
assert.ok(s5 < s0 * 1.2);

heading('VACUUM (ANALYZE) also refreshes planner statistics');
await db.query('VACUUM (ANALYZE) orders');
const st = await one(db, `SELECT reltuples::int AS rows, relpages AS pages FROM pg_class WHERE relname = 'orders'`);
show('pg_class stats', st);
assert.equal(st.rows, 20000);

heading('Autovacuum: when does it kick in?');
const settings = await one(db, `SELECT current_setting('autovacuum_vacuum_threshold') AS threshold,
                                       current_setting('autovacuum_vacuum_scale_factor') AS scale_factor`);
show('defaults', settings);
const trigger = (rows, t = +settings.threshold, f = +settings.scale_factor) => t + f * rows;
show('dead tuples needed for 20k-row table', trigger(20000));
show('dead tuples needed for 100M-row table', trigger(100_000_000).toLocaleString());
assert.equal(trigger(20000), 4050);

heading('Busy big table? Lower the scale factor for that table only');
await db.query(`ALTER TABLE orders SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_analyze_scale_factor = 0.01)`);
const opts = (await one(db, `SELECT reloptions FROM pg_class WHERE relname = 'orders'`)).reloptions;
show('reloptions', opts);
assert.ok(opts.includes('autovacuum_vacuum_scale_factor=0.02'));
show('now triggers after (100M rows)', trigger(100_000_000, 50, 0.02).toLocaleString());

await db.close();
console.log('\nOK');
