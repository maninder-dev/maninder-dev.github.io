# SQL, PostgreSQL and MySQL examples

Runnable examples for the Full-Stack Interview Handbook, topics 1-56 (database fundamentals,
PostgreSQL, MySQL), 87-101 (indexing, concurrency, performance, security, schema design) and
216-217 (database and write-the-query questions).

- **PostgreSQL** runs in-process with [PGlite](https://pglite.dev) (PostgreSQL 18 compiled to WASM),
  so nothing needs installing or starting. Tables are seeded with `generate_series` (tens of
  thousands to a million rows) so `EXPLAIN` shows real Seq Scan / Index Scan / Bitmap differences.
- **Redis** topics use `ioredis-mock`.
- **MySQL** topics (44-56, files with `mysql` in the name) connect to `localhost:3306` as `root`
  with an empty password (the WAMP default), create a throwaway database `interview_examples` and
  drop it afterwards. With no server they print the MySQL SQL plus an explanation and a
  `SKIPPED: no MySQL at localhost:3306` line, and `npm test` reports them as SKIP, not PASS.
  Topics 44 and 54 also run their PostgreSQL half for real either way.
- **Simulations**: PGlite is a single connection, so two transactions can't truly run at once.
  Concurrency topics show what genuinely works on one connection (xmin/xmax/ctid, savepoints,
  atomic conditional UPDATE, version-column optimistic locking, `FOR UPDATE` in a transaction,
  `pg_locks`) and, where real concurrency is needed, use a deterministic two-session simulation
  (`lib/sim.js`: an MVCC store with PostgreSQL's visibility rules and a lock manager with deadlock
  detection). Replication, sharding and pooling topics simulate servers with several PGlite
  instances. Each such file says "simulation" in its header.

## Usage

```bash
npm install
npm run ex 23      # run the example for one topic
npm test           # run everything: PASS / FAIL / SKIP per file, non-zero exit on any failure
```

Each PGlite instance takes a few seconds to boot; `npm test` runs files in parallel (MySQL files
one at a time) and takes a few minutes.

## Topics

| Topic | Title | File | Run |
|---|---|---|---|
| 1 | What is a Database? | [001-what-is-a-database.js](001-what-is-a-database.js) | `npm run ex 1` |
| 2 | SQL vs NoSQL | [002-sql-vs-nosql.js](002-sql-vs-nosql.js) | `npm run ex 2` |
| 3 | OLTP vs OLAP | [003-oltp-vs-olap.js](003-oltp-vs-olap.js) | `npm run ex 3` |
| 4 | ACID Properties | [004-acid.js](004-acid.js) | `npm run ex 4` |
| 5 | CAP Theorem *(simulation)* | [005-cap-theorem.js](005-cap-theorem.js) | `npm run ex 5` |
| 6 | Normalization vs Denormalization | [006-normalization.js](006-normalization.js) | `npm run ex 6` |
| 7 | Primary Key vs Foreign Key | [007-primary-foreign-keys.js](007-primary-foreign-keys.js) | `npm run ex 7` |
| 8 | Index - What and Why? | [008-index-basics.js](008-index-basics.js) | `npm run ex 8` |
| 9 | Transactions - What and Why? | [009-transactions.js](009-transactions.js) | `npm run ex 9` |
| 10 | Concurrency Control *(simulation)* | [010-concurrency-control.js](010-concurrency-control.js) | `npm run ex 10` |
| 11 | Isolation Levels *(simulation)* | [011-isolation-levels.js](011-isolation-levels.js) | `npm run ex 11` |
| 12 | Locking vs MVCC *(simulation)* | [012-locking-vs-mvcc.js](012-locking-vs-mvcc.js) | `npm run ex 12` |
| 13 | Horizontal vs Vertical Scaling *(simulation)* | [013-014-scaling-sharding-replication.js](013-014-scaling-sharding-replication.js) | `npm run ex 13` |
| 14 | Sharding vs Replication *(simulation)* | [013-014-scaling-sharding-replication.js](013-014-scaling-sharding-replication.js) | `npm run ex 14` |
| 15 | Data Consistency Models *(simulation)* | [015-consistency-models.js](015-consistency-models.js) | `npm run ex 15` |
| 16 | What is PostgreSQL? | [016-what-is-postgresql.js](016-what-is-postgresql.js) | `npm run ex 16` |
| 17 | ACID in PostgreSQL | [017-acid-in-postgres.js](017-acid-in-postgres.js) | `npm run ex 17` |
| 18 | MVCC in PostgreSQL - How It Works | [018-mvcc-in-postgres.js](018-mvcc-in-postgres.js) | `npm run ex 18` |
| 19 | Tables vs Views vs Materialized Views | [019-views-materialized-views.js](019-views-materialized-views.js) | `npm run ex 19` |
| 20 | PostgreSQL Index Types | [020-postgres-index-types.js](020-postgres-index-types.js) | `npm run ex 20` |
| 21 | Query Optimization Basics | [021-query-optimization.js](021-query-optimization.js) | `npm run ex 21` |
| 22 | The Query Planner | [022-query-planner.js](022-query-planner.js) | `npm run ex 22` |
| 23 | EXPLAIN and EXPLAIN ANALYZE | [023-explain-analyze.js](023-explain-analyze.js) | `npm run ex 23` |
| 24 | How Joins Work Internally | [024-join-algorithms.js](024-join-algorithms.js) | `npm run ex 24` |
| 25 | Index Scan vs Sequential Scan | [025-index-scan-vs-seq-scan.js](025-index-scan-vs-seq-scan.js) | `npm run ex 25` |
| 26 | Partitioning Strategies | [026-partitioning.js](026-partitioning.js) | `npm run ex 26` |
| 27 | Transactions and Locks in PostgreSQL *(simulation)* | [027-transactions-and-locks.js](027-transactions-and-locks.js) | `npm run ex 27` |
| 28 | Isolation Levels in PostgreSQL *(simulation)* | [028-isolation-levels-postgres.js](028-isolation-levels-postgres.js) | `npm run ex 28` |
| 29 | Deadlocks - How They Occur *(simulation)* | [029-deadlocks.js](029-deadlocks.js) | `npm run ex 29` |
| 30 | Row-level vs Table-level Locking | [030-row-vs-table-locks.js](030-row-vs-table-locks.js) | `npm run ex 30` |
| 31 | VACUUM - Why It's Needed | [031-032-vacuum-autovacuum.js](031-032-vacuum-autovacuum.js) | `npm run ex 31` |
| 32 | Autovacuum | [031-032-vacuum-autovacuum.js](031-032-vacuum-autovacuum.js) | `npm run ex 32` |
| 33 | PostgreSQL Performance Best Practices | [033-postgres-performance.js](033-postgres-performance.js) | `npm run ex 33` |
| 34 | Connection Pooling (PgBouncer) *(simulation)* | [034-connection-pooling.js](034-connection-pooling.js) | `npm run ex 34` |
| 35 | Query Caching | [035-query-caching.js](035-query-caching.js) | `npm run ex 35` |
| 36 | Avoiding N+1 Queries in SQL | [036-n-plus-one.js](036-n-plus-one.js) | `npm run ex 36` |
| 37 | Parallel Query Execution | [037-parallel-query.js](037-parallel-query.js) | `npm run ex 37` |
| 38 | JSONB Indexing and Queries | [038-jsonb.js](038-jsonb.js) | `npm run ex 38` |
| 39 | Stored Procedures vs Functions | [039-functions-procedures.js](039-functions-procedures.js) | `npm run ex 39` |
| 40 | Triggers - Use Cases | [040-triggers.js](040-triggers.js) | `npm run ex 40` |
| 41 | Streaming Replication *(simulation)* | [041-043-replication-ha.js](041-043-replication-ha.js) | `npm run ex 41` |
| 42 | Logical Replication *(simulation)* | [041-043-replication-ha.js](041-043-replication-ha.js) | `npm run ex 42` |
| 43 | High Availability Setups *(simulation)* | [041-043-replication-ha.js](041-043-replication-ha.js) | `npm run ex 43` |
| 44 | MySQL vs PostgreSQL *(MySQL server)* | [044-mysql-vs-postgres.js](044-mysql-vs-postgres.js) | `npm run ex 44` |
| 45 | Storage Engines: InnoDB vs MyISAM *(MySQL server)* | [045-046-mysql-innodb-myisam-acid.js](045-046-mysql-innodb-myisam-acid.js) | `npm run ex 45` |
| 46 | ACID in MySQL (InnoDB) *(MySQL server)* | [045-046-mysql-innodb-myisam-acid.js](045-046-mysql-innodb-myisam-acid.js) | `npm run ex 46` |
| 47 | MySQL Index Types and Composite Indexes *(MySQL server)* | [047-mysql-composite-indexes.js](047-mysql-composite-indexes.js) | `npm run ex 47` |
| 48 | MySQL Query Execution Flow *(MySQL server)* | [048-049-mysql-query-flow-optimization.js](048-049-mysql-query-flow-optimization.js) | `npm run ex 48` |
| 49 | MySQL Query Optimization Techniques *(MySQL server)* | [048-049-mysql-query-flow-optimization.js](048-049-mysql-query-flow-optimization.js) | `npm run ex 49` |
| 50 | Covering Indexes (MySQL) *(MySQL server)* | [050-051-mysql-covering-index-explain.js](050-051-mysql-covering-index-explain.js) | `npm run ex 50` |
| 51 | EXPLAIN in MySQL *(MySQL server)* | [050-051-mysql-covering-index-explain.js](050-051-mysql-covering-index-explain.js) | `npm run ex 51` |
| 52 | Slow Query Log *(MySQL server)* | [052-mysql-slow-query-log.js](052-mysql-slow-query-log.js) | `npm run ex 52` |
| 53 | Caching Strategies for SQL Databases | [053-caching-strategies.js](053-caching-strategies.js) | `npm run ex 53` |
| 54 | Transactions in MySQL *(MySQL server)* | [054-mysql-transactions.js](054-mysql-transactions.js) | `npm run ex 54` |
| 55 | Row Locks vs Table Locks in MySQL *(MySQL server)* | [055-056-mysql-locks-isolation.js](055-056-mysql-locks-isolation.js) | `npm run ex 55` |
| 56 | Isolation Levels in MySQL *(MySQL server)* | [055-056-mysql-locks-isolation.js](055-056-mysql-locks-isolation.js) | `npm run ex 56` |
| 87 | B-Tree Index Internals | [087-btree-internals.js](087-btree-internals.js) | `npm run ex 87` |
| 88 | Composite Indexes and the Leftmost Prefix Rule | [088-composite-leftmost-prefix.js](088-composite-leftmost-prefix.js) | `npm run ex 88` |
| 89 | Covering Indexes | [089-covering-index.js](089-covering-index.js) | `npm run ex 89` |
| 90 | When Indexes Hurt | [090-when-indexes-hurt.js](090-when-indexes-hurt.js) | `npm run ex 90` |
| 91 | MVCC Compared: PostgreSQL vs InnoDB vs MongoDB *(simulation)* | [091-mvcc-compared.js](091-mvcc-compared.js) | `npm run ex 91` |
| 92 | Race Conditions: The Concert Ticket Problem *(simulation)* | [092-concert-ticket-race.js](092-concert-ticket-race.js) | `npm run ex 92` |
| 93 | Optimistic Locking *(simulation)* | [093-optimistic-locking.js](093-optimistic-locking.js) | `npm run ex 93` |
| 94 | Pessimistic Locking *(simulation)* | [094-pessimistic-locking.js](094-pessimistic-locking.js) | `npm run ex 94` |
| 95 | Detecting Slow Queries | [095-detecting-slow-queries.js](095-detecting-slow-queries.js) | `npm run ex 95` |
| 96 | Redis as a Read Cache (Cache-Aside) | [096-redis-cache-aside.js](096-redis-cache-aside.js) | `npm run ex 96` |
| 97 | Read/Write Splitting *(simulation)* | [097-read-write-splitting.js](097-read-write-splitting.js) | `npm run ex 97` |
| 98 | SQL Injection and How to Prevent It | [098-sql-injection.js](098-sql-injection.js) | `npm run ex 98` |
| 99 | Database Security Checklist | [099-database-security.js](099-database-security.js) | `npm run ex 99` |
| 100 | Design: E-Commerce Database Schema | [100-ecommerce-schema.js](100-ecommerce-schema.js) | `npm run ex 100` |
| 101 | Design: Social Media Feed | [101-social-feed.js](101-social-feed.js) | `npm run ex 101` |
| 216 | Database Questions | [216-database-questions.js](216-database-questions.js) | `npm run ex 216` |
| 217 | SQL Query Questions (Write the Query) | [217-write-the-query.js](217-write-the-query.js) | `npm run ex 217` |

## Notes

- Topic 13-14: the handbook's comment "user 1_000_007 -> shard 1 of 3" is off; `1000007 % 3` is 2.
  The example asserts the real value.
- Topic 37: PGlite runs in one process (`max_worker_processes = 0`), so the parallel plan shows
  `Workers Launched: 0`; the plan shape is the real one a server would execute with workers.
- Topic 33 / 95: `pg_stat_statements` isn't bundled with PGlite, so the examples build the same
  "top queries by total time" view in the app and print the server SQL.
- Topic 88: PostgreSQL 18 can use a composite index without its leading column by walking the
  whole index (or a skip scan); the example measures index pages read to show it isn't a seek.
