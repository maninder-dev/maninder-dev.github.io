// Topic 6: Normalization vs Denormalization  (Full-Stack Handbook, Part 1)
// Run: npm run ex 6        (or: node 006-normalization.js)
// What it shows: in a denormalized orders table a customer's city is copied into every order, so a
// partial update leaves contradictory data (update anomaly). The 3NF design stores it once.
import assert from 'node:assert/strict';
import { createDb, all, one, heading, show, explain } from './lib/db.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE customers (id INT PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL);
  CREATE TABLE orders (id SERIAL PRIMARY KEY, customer_id INT NOT NULL REFERENCES customers(id), total INT NOT NULL);
  CREATE TABLE orders_denorm (id SERIAL PRIMARY KEY, customer_id INT, customer_name TEXT, customer_city TEXT, total INT);
  INSERT INTO customers SELECT g, 'Customer ' || g, (ARRAY['Delhi','Mumbai','Pune'])[1 + g % 3] FROM generate_series(1, 500) g;
  INSERT INTO orders (customer_id, total) SELECT 1 + g % 500, 100 + g % 900 FROM generate_series(1, 5000) g;
  INSERT INTO orders_denorm (customer_id, customer_name, customer_city, total)
    SELECT o.customer_id, c.name, c.city, o.total FROM orders o JOIN customers c ON c.id = o.customer_id;
`);

heading('Denormalized: customer 7 moves city, but a buggy job updates only some rows');
await db.query(`UPDATE orders_denorm SET customer_city = 'Bengaluru' WHERE customer_id = 7 AND id % 3 = 0`);
const cities = await all(db, `SELECT DISTINCT customer_city FROM orders_denorm WHERE customer_id = 7 ORDER BY 1`);
show('cities on record for customer 7', cities.map((r) => r.customer_city));
assert.equal(cities.length, 2, 'update anomaly: two "truths" for one fact');

heading('Normalized (3NF): the city lives in one row');
await db.query(`UPDATE customers SET city = 'Bengaluru' WHERE id = 7`);
const city = await all(db, `SELECT DISTINCT c.city FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.customer_id = 7`);
show('cities for customer 7', city.map((r) => r.city));
assert.deepEqual(city.map((r) => r.city), ['Bengaluru']);

heading('The price of normalization: reports need a join');
const reportNorm = `SELECT c.city, sum(o.total) FROM orders o JOIN customers c ON c.id = o.customer_id GROUP BY c.city`;
const reportDenorm = `SELECT customer_city, sum(total) FROM orders_denorm GROUP BY customer_city`;
const planNorm = await explain(db, reportNorm);
const planDenorm = await explain(db, reportDenorm);
show('normalized plan', planNorm);
show('denormalized plan', planDenorm);
assert.match(planNorm, /Join/);
assert.doesNotMatch(planDenorm, /Join/);
const sizes = await one(db, `SELECT pg_size_pretty(pg_total_relation_size('orders')) AS normalized,
                                    pg_size_pretty(pg_total_relation_size('orders_denorm')) AS denormalized`);
show('orders table sizes', sizes);
console.log('Rule: normalize OLTP tables; denormalize read models, caches and warehouses on purpose.');

await db.close();
console.log('\nOK');
