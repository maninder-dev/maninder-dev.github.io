// Topic 2: SQL vs NoSQL  (Full-Stack Handbook, Part 1)
// Run: npm run ex 2        (or: node 002-sql-vs-nosql.js)
// What it shows: the same user+orders data modelled relationally (two tables + JOIN) and as one
// embedded document (JSONB), and the trade-off: joins/constraints vs reading one aggregate at once.
import assert from 'node:assert/strict';
import { createDb, all, heading, show, expectPgError } from './lib/db.js';

const db = await createDb();

heading('SQL: two tables joined by a key, integrity enforced by the database');
await db.exec(`
  CREATE TABLE users  (id INT PRIMARY KEY, name TEXT NOT NULL);
  CREATE TABLE orders (id INT PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id), total INT NOT NULL);
  INSERT INTO users  VALUES (1, 'Alice'), (2, 'Bob');
  INSERT INTO orders VALUES (10, 1, 499), (11, 1, 120), (12, 2, 75);
`);
const joined = await all(db, `SELECT u.name, o.total FROM users u JOIN orders o ON o.user_id = u.id ORDER BY o.id`);
show('JOIN result', joined);
assert.equal(joined.length, 3);
// Cross-entity question is one query: revenue across all users
const revenue = (await all(db, 'SELECT sum(total)::int AS s FROM orders'))[0].s;
assert.equal(revenue, 694);
await expectPgError(() => db.query('INSERT INTO orders VALUES (13, 999, 10)'), '23503');
show('order for missing user', 'rejected by FOREIGN KEY (23503)');

heading('Document style: one document holds the related data (like MongoDB)');
await db.exec(`
  CREATE TABLE user_docs (doc JSONB NOT NULL);
  INSERT INTO user_docs VALUES
    ('{"_id": 1, "name": "Alice", "orders": [{"total": 499}, {"total": 120}]}'),
    ('{"_id": 2, "name": "Bob",   "orders": [{"total": 75}], "loyalty": {"tier": "gold"}}');
`);
const alice = (await all(db, `SELECT doc FROM user_docs WHERE doc->>'name' = 'Alice'`))[0].doc;
show('Alice in one read', alice);
assert.equal(alice.orders.length, 2);
// Flexible shape: Bob has a field Alice doesn't, no migration needed
const tiers = await all(db, `SELECT doc->>'name' AS name, doc #>> '{loyalty,tier}' AS tier FROM user_docs ORDER BY 1`);
show('optional field', tiers);
assert.equal(tiers[0].tier, null);
// ...but nothing stops a bad document (no FK, no type check)
await db.query(`INSERT INTO user_docs VALUES ('{"_id": 3, "orders": "oops"}')`);
show('bad document', 'accepted - validation is now the application\'s job');

await db.close();
console.log('\nOK');
