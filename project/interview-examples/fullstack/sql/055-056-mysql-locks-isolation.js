// Topics 55-56: Row Locks vs Table Locks in MySQL; Isolation Levels in MySQL  (Full-Stack Handbook, Part 2)
// Run: npm run ex 55       (or: node 055-056-mysql-locks-isolation.js)
// What it shows, with two real connections: an UPDATE by an unindexed column locks every scanned
// row, so another session's update of a different row times out; with an index it doesn't. Then
// REPEATABLE READ: a plain SELECT reads the snapshot while SELECT ... FOR UPDATE reads the latest
// committed row. Needs MySQL at localhost:3306, else SKIPPED.
import assert from 'node:assert/strict';
import { heading, show } from './lib/db.js';
import { withMysql, q } from './lib/mysql.js';

await withMysql({
  sql: `
-- Session A                                   -- Session B
START TRANSACTION;
UPDATE users SET plan='pro' WHERE email='u1@x.com';   -- no index: locks every scanned row
                                               UPDATE users SET plan='pro' WHERE id = 500;
                                               -- waits -> ER_LOCK_WAIT_TIMEOUT
SELECT * FROM performance_schema.data_locks;   -- many RECORD locks
ROLLBACK;  CREATE INDEX idx_email ON users(email);   -- now only one record is locked

-- REPEATABLE READ (InnoDB default)
START TRANSACTION;
SELECT qty FROM stock WHERE sku='A1';           -- 10 (snapshot)
                                               UPDATE stock SET qty = 5 WHERE sku='A1'; (autocommit)
SELECT qty FROM stock WHERE sku='A1';           -- still 10 (snapshot read)
SELECT qty FROM stock WHERE sku='A1' FOR UPDATE; -- 5 (current read + next-key lock)
COMMIT;
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;`,
  notes: `
InnoDB locks index records, not rows. Without a usable index it locks every row it examines, which
acts like a table lock. Under REPEATABLE READ it also takes gap / next-key locks to stop phantoms;
many high-traffic apps switch to READ COMMITTED to reduce gap-lock contention and deadlocks.`,
}, async (connA, open) => {
  const connB = await open();
  try {
    await connA.query(`CREATE TABLE users (id INT PRIMARY KEY, email VARCHAR(100), plan VARCHAR(10)) ENGINE = InnoDB`);
    await connA.query('SET SESSION cte_max_recursion_depth = 10000');
    await connA.query(`INSERT INTO users WITH RECURSIVE s (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 1000)
                       SELECT n, CONCAT('u', n, '@x.com'), 'free' FROM s`);
    await connB.query('SET SESSION innodb_lock_wait_timeout = 1');

    async function blockedWhileAUpdatesByEmail() {
      await connA.query('START TRANSACTION');
      await connA.query(`UPDATE users SET plan = 'pro' WHERE email = 'u1@x.com'`);
      const [locks] = await q(connA, `SELECT COUNT(*) AS n FROM performance_schema.data_locks WHERE OBJECT_NAME = 'users' AND LOCK_TYPE = 'RECORD'`);
      const r = await connB.query(`UPDATE users SET plan = 'pro' WHERE id = 500`).then(() => 'updated', (e) => e.code);
      await connA.query('ROLLBACK');
      return { recordLocks: Number(locks.n), sessionB: r };
    }
    heading('No index on email');
    const noIdx = await blockedWhileAUpdatesByEmail();
    show('A record locks / B result', noIdx);
    assert.equal(noIdx.sessionB, 'ER_LOCK_WAIT_TIMEOUT');
    heading('With INDEX (email)');
    await connA.query('CREATE INDEX idx_email ON users(email)');
    const withIdx = await blockedWhileAUpdatesByEmail();
    show('A record locks / B result', withIdx);
    assert.equal(withIdx.sessionB, 'updated');
    assert.ok(withIdx.recordLocks < noIdx.recordLocks);

    heading('REPEATABLE READ: snapshot read vs current read');
    await connA.query(`CREATE TABLE stock (sku VARCHAR(10) PRIMARY KEY, qty INT) ENGINE = InnoDB`);
    await connA.query(`INSERT INTO stock VALUES ('A1', 10)`);
    const [iso] = await q(connA, 'SELECT @@transaction_isolation AS i');
    show('isolation', iso.i);
    await connA.query('START TRANSACTION');
    const r1 = (await q(connA, `SELECT qty FROM stock WHERE sku = 'A1'`))[0].qty;
    await connB.query(`UPDATE stock SET qty = 5 WHERE sku = 'A1'`);
    const r2 = (await q(connA, `SELECT qty FROM stock WHERE sku = 'A1'`))[0].qty;
    const r3 = (await q(connA, `SELECT qty FROM stock WHERE sku = 'A1' FOR UPDATE`))[0].qty;
    await connA.query('COMMIT');
    show('snapshot, snapshot again, FOR UPDATE', [r1, r2, r3]);
    assert.deepEqual([r1, r2, r3], [10, 10, 5]);
  } finally {
    await connB.end();
  }
});
console.log('\nOK');
