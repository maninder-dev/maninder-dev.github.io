// Topic 47: MySQL Index Types and Composite Indexes  (Full-Stack Handbook, Part 2)
// Run: npm run ex 47       (or: node 047-mysql-composite-indexes.js)
// What it shows: EXPLAIN on 20,000 users with INDEX (city, age) - the leftmost-prefix rule in
// MySQL's own words (type/key columns). Also how InnoDB clusters rows on the primary key.
// Needs MySQL at localhost:3306, else SKIPPED (see 088-composite-leftmost-prefix.js for PostgreSQL).
import assert from 'node:assert/strict';
import { heading, show } from './lib/db.js';
import { withMysql, q } from './lib/mysql.js';

await withMysql({
  sql: `
CREATE TABLE users (id BIGINT AUTO_INCREMENT PRIMARY KEY, city VARCHAR(40), age INT, name VARCHAR(60));
-- 20,000 rows via a recursive CTE, then:
CREATE INDEX idx_city_age ON users (city, age);
EXPLAIN SELECT * FROM users WHERE city = 'Delhi' AND age > 30;  -- type=range, key=idx_city_age
EXPLAIN SELECT * FROM users WHERE city = 'Delhi';               -- type=ref,   key=idx_city_age
EXPLAIN SELECT * FROM users WHERE age > 30;                     -- type=ALL,   key=NULL (can't seek)`,
  notes: `
The index is sorted by city, then age within each city - a phone book. Equality columns first,
then the range / sort column. InnoDB stores rows inside the primary-key B+Tree (clustered), and
secondary indexes store the PK, so keep the PK small and increasing (BIGINT AUTO_INCREMENT,
not random UUIDv4 which splits pages all over the tree).`,
}, async (conn) => {
  await conn.query('CREATE TABLE users (id BIGINT AUTO_INCREMENT PRIMARY KEY, city VARCHAR(40), age INT, name VARCHAR(60))');
  await conn.query('SET SESSION cte_max_recursion_depth = 100000');
  await conn.query(`INSERT INTO users (city, age, name)
    WITH RECURSIVE seq (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 20000)
    SELECT IF(n % 50 = 0, 'Delhi', CONCAT('City', n % 50)), 18 + n % 60, CONCAT('User ', n) FROM seq`); // 50 cities, 400 users each
  await conn.query('CREATE INDEX idx_city_age ON users (city, age)');
  await conn.query('ANALYZE TABLE users');
  const cases = [
    ['city = Delhi AND age > 30', `SELECT * FROM users WHERE city = 'Delhi' AND age > 30`, 'idx_city_age'],
    ['city = Delhi (leftmost)', `SELECT * FROM users WHERE city = 'Delhi'`, 'idx_city_age'],
    ['age > 30 only', `SELECT * FROM users WHERE age > 30`, null],
  ];
  heading('EXPLAIN');
  for (const [label, sql, key] of cases) {
    const [plan] = await q(conn, `EXPLAIN ${sql}`);
    show(label.padEnd(28), { type: plan.type, key: plan.key, rows: plan.rows, Extra: plan.Extra });
    assert.equal(plan.key, key);
  }
});
console.log('\nOK');
