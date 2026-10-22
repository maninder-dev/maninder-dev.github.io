// Topic 9: Transactions - What and Why?  (Full-Stack Handbook, Part 1)
// Run: npm run ex 9        (or: node 009-transactions.js)
// What it shows: the handbook's BEGIN / COMMIT / ROLLBACK pattern (written for `pg`, here on PGlite)
// placing an order and decrementing stock. Out of stock -> both writes are undone.
import assert from 'node:assert/strict';
import { createDb, one, heading, show } from './lib/db.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE stock  (product_id INT PRIMARY KEY, qty INT NOT NULL CHECK (qty >= 0));
  CREATE TABLE orders (id SERIAL PRIMARY KEY, user_id INT NOT NULL, product_id INT NOT NULL, total INT NOT NULL);
  INSERT INTO stock VALUES (7, 1);
`);

// Same shape as the pg version: BEGIN, work, COMMIT; on any error ROLLBACK and rethrow.
async function placeOrder(client, userId, productId, total) {
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO orders (user_id, product_id, total) VALUES ($1, $2, $3)', [userId, productId, total]);
    await client.query('UPDATE stock SET qty = qty - 1 WHERE product_id = $1', [productId]);
    await client.query('COMMIT');
    return 'ordered';
  } catch (err) {
    await client.query('ROLLBACK');
    return `rolled back (${err.message})`;
  }
}

const state = async () => one(db, `SELECT (SELECT qty FROM stock WHERE product_id = 7) AS qty,
                                          (SELECT count(*)::int FROM orders) AS orders`);

heading('First order: stock 1 -> 0');
show('result', await placeOrder(db, 1, 7, 500));
show('state', await state());
assert.deepEqual(await state(), { qty: 0, orders: 1 });

heading('Second order: stock would go negative, CHECK fails, the INSERT is undone too');
const r = await placeOrder(db, 2, 7, 500);
show('result', r);
assert.match(r, /rolled back/);
show('state', await state());
assert.deepEqual(await state(), { qty: 0, orders: 1 }, 'no order row without stock');

heading('Without a transaction the two writes drift apart');
await db.query('INSERT INTO orders (user_id, product_id, total) VALUES (3, 7, 500)');
await db.query('UPDATE stock SET qty = qty - 1 WHERE product_id = 7').catch((e) => show('UPDATE failed', e.message));
show('state', await state());
assert.deepEqual(await state(), { qty: 0, orders: 2 }, 'an order was recorded with no stock behind it');

await db.close();
console.log('\nOK');
