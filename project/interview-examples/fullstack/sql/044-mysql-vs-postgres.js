// Topic 44: MySQL vs PostgreSQL  (Full-Stack Handbook, Part 2)
// Run: npm run ex 44       (or: node 044-mysql-vs-postgres.js)
// What it shows: the default isolation level of each (asked of the real engines), plus where each
// keeps old row versions. PostgreSQL runs in-process (PGlite); the MySQL half needs a server at
// localhost:3306 (root, empty password) and prints SKIPPED without one.
import assert from 'node:assert/strict';
import { createDb, one, heading, show } from './lib/db.js';
import { withMysql, q } from './lib/mysql.js';

heading('PostgreSQL (PGlite)');
const pg = await createDb();
const pgIso = (await one(pg, 'SHOW default_transaction_isolation')).default_transaction_isolation;
show('default isolation', pgIso);
assert.equal(pgIso, 'read committed');
await pg.exec('CREATE TABLE t (id INT PRIMARY KEY, v INT); INSERT INTO t VALUES (1, 1); UPDATE t SET v = 2;');
show('old versions live in', 'the table heap itself (dead tuples, cleaned by VACUUM)');
await pg.close();

heading('MySQL (InnoDB)');
await withMysql({
  sql: `
SELECT VERSION(), @@transaction_isolation, @@default_storage_engine;
SELECT @@innodb_buffer_pool_size;`,
  notes: `
@@transaction_isolation = REPEATABLE-READ   (PostgreSQL: read committed)
@@default_storage_engine = InnoDB           (pluggable engines; PostgreSQL has one heap + extensions)
Old row versions: InnoDB updates in place and keeps the previous version in the undo log,
purged by a background thread. One thread per connection (PostgreSQL: one process per connection).
JSON: MySQL indexes JSON through generated columns; PostgreSQL has JSONB + GIN.`,
}, async (conn) => {
  const [row] = await q(conn, 'SELECT VERSION() AS v, @@transaction_isolation AS iso, @@default_storage_engine AS engine');
  show('server', row);
  assert.equal(row.iso, 'REPEATABLE-READ');
  assert.equal(row.engine, 'InnoDB');
});
console.log('\nOK');
