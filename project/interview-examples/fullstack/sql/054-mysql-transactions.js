// Topic 54: Transactions in MySQL  (Full-Stack Handbook, Part 2)
// Run: npm run ex 54       (or: node 054-mysql-transactions.js)
// What it shows: START TRANSACTION with a guarded inventory decrement, and MySQL's implicit commit
// on DDL - a CREATE TABLE inside a transaction commits the earlier INSERT, so ROLLBACK can't undo
// it. The PostgreSQL contrast (transactional DDL) runs for real on PGlite. MySQL half needs a
// server at localhost:3306, else SKIPPED.
import assert from 'node:assert/strict';
import { createDb, one, heading, show } from './lib/db.js';
import { withMysql, q } from './lib/mysql.js';

heading('PostgreSQL: DDL is transactional');
const pg = await createDb();
await pg.exec('CREATE TABLE orders (sku TEXT, user_id INT)');
await pg.query('BEGIN');
await pg.query(`INSERT INTO orders VALUES ('A1', 42)`);
await pg.query('CREATE TABLE audit (x INT)');
await pg.query('ROLLBACK');
const pgRows = (await one(pg, 'SELECT count(*)::int AS n FROM orders')).n;
show('orders after ROLLBACK (insert + CREATE TABLE undone together)', pgRows);
assert.equal(pgRows, 0);
await pg.close();

heading('MySQL');
await withMysql({
  sql: `
START TRANSACTION;
UPDATE inventory SET qty = qty - 1 WHERE sku = 'A1' AND qty > 0;   -- affectedRows 0 => sold out
INSERT INTO orders (sku, user_id) VALUES ('A1', 42);
COMMIT;

START TRANSACTION;
INSERT INTO orders (sku, user_id) VALUES ('A1', 7);
CREATE TABLE audit (x INT);     -- implicit COMMIT happens here
ROLLBACK;                       -- too late: user 7's order stays`,
  notes: `
SET autocommit = 0 or START TRANSACTION begins a transaction. DDL (CREATE, ALTER, DROP) causes an
implicit commit in MySQL, so it can't be rolled back with the surrounding work - unlike PostgreSQL.`,
}, async (conn) => {
  await conn.query(`CREATE TABLE inventory (sku VARCHAR(10) PRIMARY KEY, qty INT NOT NULL) ENGINE = InnoDB`);
  await conn.query(`CREATE TABLE orders (id INT AUTO_INCREMENT PRIMARY KEY, sku VARCHAR(10), user_id INT) ENGINE = InnoDB`);
  await conn.query(`INSERT INTO inventory VALUES ('A1', 1)`);
  async function buy(userId) {
    await conn.query('START TRANSACTION');
    const [res] = await conn.query(`UPDATE inventory SET qty = qty - 1 WHERE sku = 'A1' AND qty > 0`);
    if (res.affectedRows === 0) { await conn.query('ROLLBACK'); return 'sold out'; }
    await conn.query(`INSERT INTO orders (sku, user_id) VALUES ('A1', ?)`, [userId]);
    await conn.query('COMMIT');
    return 'ordered';
  }
  show('user 42', await buy(42));
  show('user 43', await buy(43));
  assert.equal(Number((await q(conn, 'SELECT COUNT(*) AS n FROM orders'))[0].n), 1);

  await conn.query('START TRANSACTION');
  await conn.query(`INSERT INTO orders (sku, user_id) VALUES ('A1', 7)`);
  await conn.query('CREATE TABLE audit (x INT)');
  await conn.query('ROLLBACK');
  const n = Number((await q(conn, 'SELECT COUNT(*) AS n FROM orders WHERE user_id = 7'))[0].n);
  show('user 7 orders after ROLLBACK (DDL committed it)', n);
  assert.equal(n, 1);
});
console.log('\nOK');
