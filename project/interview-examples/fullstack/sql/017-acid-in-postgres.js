// Topic 17: ACID in PostgreSQL  (Full-Stack Handbook, Part 2)
// Run: npm run ex 17       (or: node 017-acid-in-postgres.js)
// What it shows: SAVEPOINT / ROLLBACK TO undoing part of a transaction (the handbook's order example),
// a DEFERRABLE foreign key checked only at COMMIT, and transactional DDL.
import assert from 'node:assert/strict';
import { createDb, all, heading, show, expectPgError } from './lib/db.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE skus (sku TEXT PRIMARY KEY);
  INSERT INTO skus VALUES ('SKU-42');
  CREATE TABLE orders (id INT PRIMARY KEY, total INT NOT NULL);
  CREATE TABLE order_items (order_id INT REFERENCES orders(id), sku TEXT NOT NULL REFERENCES skus(sku));
`);

heading('Savepoints: undo one failed step, keep the rest');
await db.query('BEGIN');
await db.query('INSERT INTO orders (id, total) VALUES (1, 100)');
await db.query('SAVEPOINT before_items');
const err = await expectPgError(() => db.query(`INSERT INTO order_items (order_id, sku) VALUES (1, 'BAD-SKU')`), '23503');
show('bad item', err.message);
await db.query('ROLLBACK TO before_items');
await db.query(`INSERT INTO order_items (order_id, sku) VALUES (1, 'SKU-42')`);
await db.query('COMMIT');
const items = await all(db, 'SELECT order_id, sku FROM order_items');
show('committed items', items);
assert.deepEqual(items, [{ order_id: 1, sku: 'SKU-42' }]);
assert.equal((await all(db, 'SELECT * FROM orders')).length, 1, 'the order survived the failed item');

heading('Without the savepoint, one error poisons the whole transaction');
await db.query('BEGIN');
await expectPgError(() => db.query(`INSERT INTO order_items VALUES (1, 'BAD-SKU')`));
const aborted = await expectPgError(() => db.query('SELECT 1'), '25P02');
show('next statement', aborted.message);
await db.query('ROLLBACK');

heading('Consistency checked at COMMIT: DEFERRABLE constraints');
await db.exec(`
  CREATE TABLE parents (id INT PRIMARY KEY);
  CREATE TABLE children (id INT PRIMARY KEY, parent_id INT REFERENCES parents(id) DEFERRABLE INITIALLY DEFERRED);
`);
await db.transaction(async (tx) => {
  await tx.query('INSERT INTO children VALUES (1, 10)'); // parent doesn't exist yet - allowed for now
  await tx.query('INSERT INTO parents VALUES (10)');
});
show('child inserted before parent', 'OK, the FK was checked at COMMIT');
await expectPgError(() => db.transaction((tx) => tx.query('INSERT INTO children VALUES (2, 99)')), '23503');
show('child with no parent ever', 'rejected at COMMIT');

heading('Transactional DDL: CREATE TABLE can be rolled back');
await db.query('BEGIN');
await db.query('CREATE TABLE temp_report (x INT)');
await db.query('ROLLBACK');
const exists = (await all(db, `SELECT to_regclass('temp_report') AS t`))[0].t;
show('temp_report after ROLLBACK', exists);
assert.equal(exists, null);

await db.close();
console.log('\nOK');
