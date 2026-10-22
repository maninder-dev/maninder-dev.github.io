// Topics 50-51: Covering Indexes; EXPLAIN in MySQL  (Full-Stack Handbook, Part 2)
// Run: npm run ex 50       (or: node 050-051-mysql-covering-index-explain.js)
// What it shows: EXPLAIN's type / key / rows / Extra columns, "Using filesort" before an index,
// and "Using index" once (user_id, status, total) covers the query. Needs MySQL at localhost:3306,
// else SKIPPED (089-covering-index.js shows the PostgreSQL INCLUDE version for real).
import assert from 'node:assert/strict';
import { heading, show } from './lib/db.js';
import { withMysql, q } from './lib/mysql.js';

await withMysql({
  sql: `
EXPLAIN SELECT * FROM orders WHERE user_id = 42 ORDER BY created_at;
--   type=ALL  key=NULL  Extra="Using where; Using filesort"      (full scan + sort)
CREATE INDEX idx_user_created ON orders (user_id, created_at);
EXPLAIN SELECT * FROM orders WHERE user_id = 42 ORDER BY created_at;
--   type=ref  key=idx_user_created  Extra=NULL                   (no filesort)
CREATE INDEX idx_user_status_total ON orders (user_id, status, total);
EXPLAIN SELECT status, total FROM orders WHERE user_id = 42;
--   type=ref  key=idx_user_status_total  Extra="Using index"     (covered, no table lookup)
EXPLAIN ANALYZE SELECT status, total FROM orders WHERE user_id = 42;   -- MySQL 8.0.18+`,
  notes: `
type, best to worst: const, eq_ref, ref, range, index, ALL.  key = index used (NULL = none).
rows = estimated rows examined.  Extra: "Using index" good; "Using filesort" / "Using temporary"
are warnings. PostgreSQL equivalent of a covering index: CREATE INDEX ... (user_id) INCLUDE (status, total).`,
}, async (conn) => {
  await conn.query(`CREATE TABLE orders (id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id INT, status VARCHAR(20),
                    total DECIMAL(10,2), created_at DATETIME, note VARCHAR(200))`);
  await conn.query('SET SESSION cte_max_recursion_depth = 100000');
  await conn.query(`INSERT INTO orders (user_id, status, total, created_at, note)
    WITH RECURSIVE seq (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 30000)
    SELECT 1 + n % 1000, ELT(1 + n % 3, 'paid','shipped','pending'), n % 500, TIMESTAMP('2026-01-01') + INTERVAL n MINUTE, REPEAT('x', 100) FROM seq`);
  await conn.query('ANALYZE TABLE orders');
  const ex = async (sql) => { const [p] = await q(conn, `EXPLAIN ${sql}`); return { type: p.type, key: p.key, rows: p.rows, Extra: p.Extra }; };

  heading('No index');
  const before = await ex('SELECT * FROM orders WHERE user_id = 42 ORDER BY created_at');
  show('plan', before);
  assert.equal(before.type, 'ALL');
  assert.match(before.Extra, /filesort/);

  heading('INDEX (user_id, created_at)');
  await conn.query('CREATE INDEX idx_user_created ON orders (user_id, created_at)');
  const after = await ex('SELECT * FROM orders WHERE user_id = 42 ORDER BY created_at');
  show('plan', after);
  assert.equal(after.type, 'ref');
  assert.doesNotMatch(after.Extra ?? '', /filesort/);

  heading('Covering INDEX (user_id, status, total)');
  await conn.query('CREATE INDEX idx_user_status_total ON orders (user_id, status, total)');
  const covered = await ex('SELECT status, total FROM orders WHERE user_id = 42');
  show('plan', covered);
  assert.match(covered.Extra, /Using index/);
});
console.log('\nOK');
