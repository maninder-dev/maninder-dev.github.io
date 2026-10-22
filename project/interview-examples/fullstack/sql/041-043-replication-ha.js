// Topics 41-43: Streaming Replication, Logical Replication, High Availability  (Full-Stack Handbook, Part 2)
// Run: npm run ex 41       (or: node 041-043-replication-ha.js)
// What it shows (simulation - replication needs several servers): a primary whose real WAL position
// (pg_current_wal_lsn) advances on each write, standbys that replay a shipped change log, async vs
// sync commit and what each loses on failover, logical replication of chosen tables only, and a
// failover manager promoting the most up-to-date standby (RPO / RTO).
import assert from 'node:assert/strict';
import { createDb, one, heading, show } from './lib/db.js';

const schema = `CREATE TABLE orders (id INT PRIMARY KEY, total INT); CREATE TABLE sessions (id INT PRIMARY KEY, token TEXT);`;
const make = async (name) => { const db = await createDb(); await db.exec(schema); return { name, db, applied: 0 }; };
const primary = await make('primary');
const syncStandby = await make('standby-sync');
const asyncStandby = await make('standby-async');
const logical = await make('analytics (logical, orders only)');
const wal = []; // change records shipped to standbys: { lsn, table, sql, params }

const lsn = async () => (await one(primary.db, 'SELECT pg_current_wal_lsn()::text AS l')).l;
async function commit(table, sql, params, { asyncLagging = false } = {}) {
  await primary.db.query(sql, params);
  const rec = { lsn: await lsn(), table, sql, params };
  wal.push(rec);
  await replay(syncStandby); // synchronous: COMMIT returns only after this standby has it
  if (!asyncLagging) await replay(asyncStandby);
  return rec.lsn;
}
async function replay(standby, tables) {
  for (; standby.applied < wal.length; standby.applied++) {
    const r = wal[standby.applied];
    if (!tables || tables.includes(r.table)) await standby.db.query(r.sql, r.params);
  }
}
const count = async (s, t = 'orders') => (await one(s.db, `SELECT count(*)::int AS n FROM ${t}`)).n;

heading('Streaming replication: standbys replay the primary\'s WAL');
const first = await lsn();
for (let i = 1; i <= 3; i++) await commit('orders', 'INSERT INTO orders VALUES ($1, $2)', [i, i * 100]);
await commit('sessions', 'INSERT INTO sessions VALUES (1, $1)', ['abc']);
show('primary WAL position', `${first} -> ${await lsn()}`);
show('orders on primary / sync / async', [await count(primary), await count(syncStandby), await count(asyncStandby)]);
assert.equal(await count(asyncStandby), 3);

heading('Async standby falls behind under load (replication lag)');
for (let i = 4; i <= 6; i++) await commit('orders', 'INSERT INTO orders VALUES ($1, $2)', [i, i * 100], { asyncLagging: true });
const lagRecords = wal.length - asyncStandby.applied;
show('records the async standby has not replayed', lagRecords);
assert.equal(lagRecords, 3);

heading('Logical replication: publish only the orders table');
await replay(logical, ['orders']);
show('analytics: orders / sessions', [await count(logical), await count(logical, 'sessions')]);
assert.deepEqual([await count(logical), await count(logical, 'sessions')], [6, 0]);
console.log('  (CREATE PUBLICATION orders_pub FOR TABLE orders; CREATE SUBSCRIPTION ... PUBLICATION orders_pub)');

heading('HA: the primary dies - the failover manager promotes the best standby');
const candidates = [syncStandby, asyncStandby];
const best = candidates.reduce((a, b) => (b.applied > a.applied ? b : a));
show('standby positions (records applied)', candidates.map((c) => `${c.name}=${c.applied}`));
show('promoted', best.name);
assert.equal(best, syncStandby);
const lost = await count(primary) - await count(best);
show('committed orders lost (RPO) with the sync standby', lost);
assert.equal(lost, 0);
show('...had we promoted the async standby instead', await count(primary) - await count(asyncStandby));
const t = performance.now();
await best.db.query('INSERT INTO orders VALUES (7, 700)'); // the stable endpoint now points here
show('new primary accepts writes; RTO here', `${(performance.now() - t).toFixed(1)} ms + detection time`);
assert.equal(await count(best), 7);

for (const s of [primary, syncStandby, asyncStandby, logical]) await s.db.close();
console.log('\nReal setups: Patroni + etcd or a managed service; HAProxy/PgBouncer/DNS as the stable endpoint.');
console.log('\nOK');
