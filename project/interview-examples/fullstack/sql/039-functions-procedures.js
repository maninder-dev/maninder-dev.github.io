// Topic 39: Stored Procedures vs Functions  (Full-Stack Handbook, Part 2)
// Run: npm run ex 39       (or: node 039-functions-procedures.js)
// What it shows: a SQL function used inside SELECT, and a PL/pgSQL procedure called with CALL that
// archives old orders and COMMITs inside itself. A function can't COMMIT; a procedure can't be
// used in SELECT.
import assert from 'node:assert/strict';
import { createDb, all, one, heading, show, expectPgError } from './lib/db.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE orders (id SERIAL PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL);
  CREATE TABLE order_items (order_id INT REFERENCES orders(id), qty INT NOT NULL, price NUMERIC(10,2) NOT NULL);
  CREATE TABLE orders_archive (LIKE orders);
  INSERT INTO orders (created_at) SELECT now() - g * interval '1 month' FROM generate_series(0, 23) g;
  INSERT INTO order_items SELECT id, 1 + id % 3, 10 * id FROM orders;
  INSERT INTO order_items SELECT id, 1, 5 FROM orders;

  CREATE FUNCTION order_total(p_order INT) RETURNS NUMERIC AS $$
    SELECT SUM(qty * price) FROM order_items WHERE order_id = p_order;
  $$ LANGUAGE sql STABLE;

  CREATE PROCEDURE archive_old_orders() LANGUAGE plpgsql AS $$
  BEGIN
    INSERT INTO orders_archive SELECT * FROM orders WHERE created_at < now() - interval '1 year';
    DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE created_at < now() - interval '1 year');
    DELETE FROM orders WHERE created_at < now() - interval '1 year';
    COMMIT;
  END $$;
`);

heading('Function: returns a value, usable in SELECT');
const totals = await all(db, 'SELECT id, order_total(id) AS total FROM orders ORDER BY id LIMIT 3');
show('first orders', totals);
assert.equal(Number(totals[0].total), 1 * 2 * 10 + 5);

heading('Procedure: CALL it; it commits its own work');
await db.query('CALL archive_old_orders()');
const counts = await one(db, `SELECT (SELECT count(*)::int FROM orders) AS live, (SELECT count(*)::int FROM orders_archive) AS archived`);
show('after CALL', counts);
assert.deepEqual(counts, { live: 12, archived: 12 });

heading('The differences, enforced');
const e1 = await expectPgError(() => db.query('SELECT archive_old_orders()'));
show('procedure in SELECT', e1.message);
await db.exec(`CREATE FUNCTION bad() RETURNS void LANGUAGE plpgsql AS $$ BEGIN COMMIT; END $$;`);
const e2 = await expectPgError(() => db.query('SELECT bad()'));
show('COMMIT inside a function', e2.message);
await db.query('BEGIN');
const e3 = await expectPgError(() => db.query('CALL archive_old_orders()'));
await db.query('ROLLBACK');
show('CALL with COMMIT inside an outer transaction', e3.message);

await db.close();
console.log('\nOK');
