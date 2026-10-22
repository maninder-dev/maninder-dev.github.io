// Topic 98: SQL Injection and How to Prevent It  (Full-Stack Handbook, Part 5)
// Run: npm run ex 98       (or: node 098-sql-injection.js)
// What it shows: the handbook's vulnerable string-built query returning every user for the input
// ' OR '1'='1, a UNION attack reading password hashes, a stacked DROP TABLE through exec(), and the
// parameterized version treating all of it as plain data. Also safe dynamic identifiers.
import assert from 'node:assert/strict';
import { createDb, all, heading, show } from './lib/db.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL);
  INSERT INTO users (email, password_hash) SELECT 'user' || g || '@x.com', 'bcrypt$' || md5(g::text) FROM generate_series(1, 100) g;
`);
const body = (email) => ({ email });

heading(`VULNERABLE: input  ' OR '1'='1`);
const req1 = body(`' OR '1'='1`);
const q1 = `SELECT id, email FROM users WHERE email = '${req1.email}'`;
show('built SQL', q1);
const leaked = await all(db, q1);
show('rows returned', leaked.length);
assert.equal(leaked.length, 100);

heading(`VULNERABLE: UNION attack reads another column`);
const req2 = body(`nobody' UNION SELECT id, password_hash FROM users WHERE id = 1 --`);
const stolen = await all(db, `SELECT id, email FROM users WHERE email = '${req2.email}'`);
show('returned "email"', stolen[0].email);
assert.match(stolen[0].email, /^bcrypt\$/);

heading('VULNERABLE: stacked statement through a multi-statement API');
const req3 = body(`x'; DROP TABLE users; --`);
await db.exec(`SELECT id FROM users WHERE email = '${req3.email}'`);
const gone = (await all(db, `SELECT to_regclass('users') AS t`))[0].t;
show('users table after the request', gone ?? 'DROPPED');
assert.equal(gone, null);

heading('SAFE: parameterized query - input is always data');
await db.exec(`CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL);
               INSERT INTO users (email, password_hash) VALUES ('ann@x.com', 'bcrypt$abc');`);
for (const req of [req1, req2, req3]) {
  const rows = await all(db, 'SELECT id, email FROM users WHERE email = $1', [req.email]);
  show(`$1 = ${JSON.stringify(req.email).slice(0, 40)}`, `${rows.length} rows`);
  assert.equal(rows.length, 0);
}
assert.equal((await all(db, 'SELECT * FROM users WHERE email = $1', ['ann@x.com'])).length, 1);

heading('Identifiers (ORDER BY column) cannot be parameters: allow-list them');
const SORTABLE = new Set(['id', 'email']);
const orderBy = (col) => { if (!SORTABLE.has(col)) throw new Error(`invalid sort column: ${col}`); return col; };
show('sort=email', (await all(db, `SELECT email FROM users ORDER BY ${orderBy('email')}`)).length + ' row');
assert.throws(() => orderBy('id; DROP TABLE users'), /invalid sort column/);
show('sort=id; DROP TABLE users', 'rejected');
console.log('\nORMs parameterize for you, but raw escape hatches ($queryRawUnsafe, sequelize.literal) do not.');

await db.close();
console.log('\nOK');
