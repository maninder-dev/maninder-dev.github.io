// Topic 99: Database Security Checklist  (Full-Stack Handbook, Part 5)
// Run: npm run ex 99       (or: node 099-database-security.js)
// What it shows: least privilege for real - an app_user role that can SELECT/INSERT/UPDATE/DELETE
// but not DROP, ALTER, CREATE in public or read a secrets table. Plus row-level security so a
// tenant only sees its own rows. (TLS, network and backups are infrastructure, listed at the end.)
import assert from 'node:assert/strict';
import { createDb, all, one, heading, show, expectPgError } from './lib/db.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE orders (id SERIAL PRIMARY KEY, tenant TEXT NOT NULL, total INT NOT NULL);
  CREATE TABLE admin_secrets (k TEXT, v TEXT);
  INSERT INTO orders (tenant, total) VALUES ('acme', 100), ('acme', 250), ('globex', 999);
  INSERT INTO admin_secrets VALUES ('stripe_key', 'sk_live_...');

  CREATE ROLE app_user LOGIN;
  GRANT USAGE ON SCHEMA public TO app_user;
  GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO app_user;
  GRANT USAGE ON SEQUENCE orders_id_seq TO app_user;
  REVOKE CREATE ON SCHEMA public FROM PUBLIC;
`);

heading('As app_user');
await db.query('SET ROLE app_user');
show('current_user', (await one(db, 'SELECT current_user')).current_user);
await db.query(`INSERT INTO orders (tenant, total) VALUES ('acme', 5)`);
show('INSERT / SELECT on orders', `ok (${(await all(db, 'SELECT * FROM orders')).length} rows)`);
const denied = {
  'DROP TABLE orders': '42501',
  'ALTER TABLE orders ADD COLUMN x INT': '42501',
  'SELECT * FROM admin_secrets': '42501',
  'CREATE TABLE evil (x INT)': '42501',
};
for (const [sql, code] of Object.entries(denied)) {
  const e = await expectPgError(() => db.query(sql), code);
  show(sql.padEnd(36), e.message);
}
await db.query('RESET ROLE');

heading('Row-level security: each tenant sees only its rows');
await db.exec(`
  ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation ON orders USING (tenant = current_setting('app.tenant'));
`);
await db.query('SET ROLE app_user');
await db.query(`SET app.tenant = 'acme'`);
const acme = await all(db, 'SELECT tenant, total FROM orders ORDER BY id');
show('acme sees', acme);
assert.ok(acme.every((r) => r.tenant === 'acme') && acme.length === 3);
await db.query(`SET app.tenant = 'globex'`);
const globex = await all(db, 'SELECT tenant, total FROM orders');
show('globex sees', globex);
assert.deepEqual(globex, [{ tenant: 'globex', total: 999 }]);
await db.query('RESET ROLE');

console.log(`
  Also on the checklist (infrastructure, not runnable here):
  - parameterized queries + input validation (098)      - TLS in transit, encryption at rest
  - DB in a private subnet, never expose 5432 / 27017    - credentials in a secrets manager, rotated
  - hash passwords with bcrypt / argon2                  - automated backups + tested restores
  - audit-log admin actions`);
await db.close();
console.log('\nOK');
