// Topics 48-49: MySQL Query Execution Flow; MySQL Query Optimization Techniques  (Full-Stack Handbook, Part 2)
// Run: npm run ex 48       (or: node 048-049-mysql-query-flow-optimization.js)
// What it shows: the parser/preprocessor rejecting bad SQL before the optimizer runs, then the
// handbook's DATE(created_at) vs range rewrite (EXPLAIN type ALL vs range), keyset vs OFFSET and
// FORCE INDEX. Needs MySQL at localhost:3306, else SKIPPED (021 shows the same ideas on PostgreSQL).
import assert from 'node:assert/strict';
import { heading, show } from './lib/db.js';
import { withMysql, q } from './lib/mysql.js';

await withMysql({
  sql: `
-- Flow: connection thread -> parser -> preprocessor -> optimizer -> executor -> InnoDB -> buffer pool
SELEC 1;                                         -- parser: ER_PARSE_ERROR
SELECT nope FROM orders;                         -- preprocessor: ER_BAD_FIELD_ERROR
EXPLAIN SELECT * FROM orders WHERE DATE(created_at) = '2026-10-15';            -- type=ALL
EXPLAIN SELECT * FROM orders
  WHERE created_at >= '2026-10-15' AND created_at < '2026-10-16';            -- type=range
EXPLAIN SELECT * FROM orders FORCE INDEX (idx_status_created) WHERE status = 'paid';
SELECT id FROM orders WHERE id > 15000 ORDER BY id LIMIT 20;                 -- keyset, not OFFSET`,
  notes: `
Functions on an indexed column hide it from the optimizer; rewrite as a range. Size
innodb_buffer_pool_size to ~60-75% of RAM on a dedicated server. Use hints (FORCE INDEX) only when
the cost-based optimizer is demonstrably wrong.`,
}, async (conn) => {
  heading('Parser and preprocessor errors happen before any data is read');
  const parse = await conn.query('SELEC 1').catch((e) => e);
  show('SELEC 1', parse.code);
  assert.equal(parse.code, 'ER_PARSE_ERROR');
  await conn.query(`CREATE TABLE orders (id BIGINT AUTO_INCREMENT PRIMARY KEY, status VARCHAR(20), created_at DATETIME,
                    INDEX idx_created (created_at), INDEX idx_status_created (status, created_at))`);
  const bad = await conn.query('SELECT nope FROM orders').catch((e) => e);
  show('unknown column', bad.code);
  assert.equal(bad.code, 'ER_BAD_FIELD_ERROR');

  await conn.query('SET SESSION cte_max_recursion_depth = 100000');
  await conn.query(`INSERT INTO orders (status, created_at)
    WITH RECURSIVE seq (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 20000)
    SELECT ELT(1 + n % 4, 'paid','shipped','pending','cancelled'), TIMESTAMP('2026-01-01') + INTERVAL n * 20 MINUTE FROM seq`);
  await conn.query('ANALYZE TABLE orders');

  heading('Function on the column vs a range');
  const [fn] = await q(conn, `EXPLAIN SELECT * FROM orders WHERE DATE(created_at) = '2026-03-15'`);
  const [rg] = await q(conn, `EXPLAIN SELECT * FROM orders WHERE created_at >= '2026-03-15' AND created_at < '2026-03-16'`);
  show('DATE(created_at) =', { type: fn.type, key: fn.key, rows: fn.rows });
  show('range             ', { type: rg.type, key: rg.key, rows: rg.rows });
  assert.equal(fn.type, 'ALL');
  assert.equal(rg.type, 'range');

  heading('FORCE INDEX and keyset pagination');
  const [forced] = await q(conn, `EXPLAIN SELECT * FROM orders FORCE INDEX (idx_status_created) WHERE status = 'paid'`);
  show('FORCE INDEX', { type: forced.type, key: forced.key });
  assert.equal(forced.key, 'idx_status_created');
  const [ks] = await q(conn, 'EXPLAIN SELECT id FROM orders WHERE id > 15000 ORDER BY id LIMIT 20');
  show('keyset', { type: ks.type, key: ks.key });
  assert.equal(ks.key, 'PRIMARY');
});
console.log('\nOK');
