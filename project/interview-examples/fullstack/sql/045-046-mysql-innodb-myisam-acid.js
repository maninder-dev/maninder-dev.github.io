// Topics 45-46: Storage Engines InnoDB vs MyISAM; ACID in MySQL (InnoDB)  (Full-Stack Handbook, Part 2)
// Run: npm run ex 45       (or: node 045-046-mysql-innodb-myisam-acid.js)
// What it shows: the same ROLLBACK on an InnoDB table and a MyISAM table - InnoDB undoes the insert
// (undo log), MyISAM can't (no transactions). InnoDB enforces foreign keys. Durability setting
// innodb_flush_log_at_trx_commit is read back. Needs MySQL at localhost:3306, else SKIPPED.
import assert from 'node:assert/strict';
import { heading, show } from './lib/db.js';
import { withMysql, q } from './lib/mysql.js';

await withMysql({
  sql: `
CREATE TABLE payments_innodb (id BIGINT AUTO_INCREMENT PRIMARY KEY, amount DECIMAL(10,2)) ENGINE = InnoDB;
CREATE TABLE payments_myisam (id BIGINT AUTO_INCREMENT PRIMARY KEY, amount DECIMAL(10,2)) ENGINE = MyISAM;
START TRANSACTION;
INSERT INTO payments_innodb (amount) VALUES (100);
INSERT INTO payments_myisam (amount) VALUES (100);
ROLLBACK;                                   -- warning 1196: some non-transactional tables couldn't be rolled back
SELECT COUNT(*) FROM payments_innodb;       -- 0
SELECT COUNT(*) FROM payments_myisam;       -- 1  (MyISAM ignored the transaction)
SHOW TABLE STATUS WHERE Name = 'payments_innodb';
ALTER TABLE payments_myisam ENGINE = InnoDB; -- migrate legacy tables
SELECT @@innodb_flush_log_at_trx_commit;     -- 1 = redo log flushed at every COMMIT (durable)`,
  notes: `
InnoDB: transactions, row locks, foreign keys, crash recovery (redo log + doublewrite buffer).
MyISAM: table locks only, no transactions, no foreign keys, can corrupt on crash.
ACID in InnoDB: undo log (atomicity + MVCC), constraints (consistency), MVCC + record/gap locks
(isolation), redo log flushed at commit (durability).`,
}, async (conn) => {
  await conn.query(`CREATE TABLE payments_innodb (id BIGINT AUTO_INCREMENT PRIMARY KEY, amount DECIMAL(10,2)) ENGINE = InnoDB`);
  await conn.query(`CREATE TABLE payments_myisam (id BIGINT AUTO_INCREMENT PRIMARY KEY, amount DECIMAL(10,2)) ENGINE = MyISAM`);
  heading('ROLLBACK on both engines');
  await conn.query('START TRANSACTION');
  await conn.query('INSERT INTO payments_innodb (amount) VALUES (100)');
  await conn.query('INSERT INTO payments_myisam (amount) VALUES (100)');
  await conn.query('ROLLBACK');
  const [inno] = await q(conn, 'SELECT COUNT(*) AS n FROM payments_innodb');
  const [myi] = await q(conn, 'SELECT COUNT(*) AS n FROM payments_myisam');
  show('rows after ROLLBACK: InnoDB / MyISAM', `${inno.n} / ${myi.n}`);
  assert.equal(Number(inno.n), 0);
  assert.equal(Number(myi.n), 1);

  heading('Foreign keys are enforced by InnoDB');
  await conn.query('CREATE TABLE users (id INT PRIMARY KEY) ENGINE = InnoDB');
  await conn.query('CREATE TABLE posts (id INT PRIMARY KEY, user_id INT, FOREIGN KEY (user_id) REFERENCES users(id)) ENGINE = InnoDB');
  const err = await conn.query('INSERT INTO posts VALUES (1, 999)').catch((e) => e);
  show('orphan insert', err.message);
  assert.equal(err.code, 'ER_NO_REFERENCED_ROW_2');

  heading('Migrate and check durability setting');
  await conn.query('ALTER TABLE payments_myisam ENGINE = InnoDB');
  const [st] = await q(conn, `SHOW TABLE STATUS WHERE Name = 'payments_myisam'`);
  show('payments_myisam engine now', st.Engine);
  assert.equal(st.Engine, 'InnoDB');
  const [d] = await q(conn, 'SELECT @@innodb_flush_log_at_trx_commit AS f');
  show('innodb_flush_log_at_trx_commit', d.f);
});
console.log('\nOK');
