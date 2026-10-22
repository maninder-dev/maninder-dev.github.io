// Topic 20: PostgreSQL Index Types  (Full-Stack Handbook, Part 2)
// Run: npm run ex 20       (or: node 020-postgres-index-types.js)
// What it shows: each index type from the handbook built on seeded data, with the plan proving the
// planner uses it: B-Tree, Hash, GIN (JSONB, arrays), GiST (ranges), BRIN, partial and expression.
import assert from 'node:assert/strict';
import { createDb, one, explain, heading, show } from './lib/db.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE orders (id SERIAL PRIMARY KEY, status TEXT, created_at TIMESTAMPTZ);
  INSERT INTO orders (status, created_at)
    SELECT CASE WHEN g % 50 = 0 THEN 'pending' ELSE 'done' END, timestamptz '2026-01-01' + g * interval '1 minute'
    FROM generate_series(1, 60000) g;
  CREATE TABLE sessions (token TEXT);
  INSERT INTO sessions SELECT md5(g::text) FROM generate_series(1, 30000) g;
  CREATE TABLE products (id SERIAL PRIMARY KEY, data JSONB, tags TEXT[]);
  INSERT INTO products (data, tags)
    SELECT jsonb_build_object('name', 'p' || g, 'category', (ARRAY['laptop','phone','tv','camera'])[1 + g % 4], 'ram', 8 * (1 + g % 4)),
           ARRAY[(ARRAY['apple','sale','new','refurb','gift'])[1 + g % 5], 'tag' || (g % 997)]
    FROM generate_series(1, 30000) g;
  CREATE TABLE bookings (room INT, during TSTZRANGE);
  INSERT INTO bookings SELECT g % 100, tstzrange(timestamptz '2026-01-01' + g * interval '1 hour', timestamptz '2026-01-01' + g * interval '1 hour' + interval '50 minutes')
    FROM generate_series(1, 30000) g;
  CREATE TABLE logs (logged_at TIMESTAMPTZ, msg TEXT);
  INSERT INTO logs SELECT timestamptz '2026-01-01' + g * interval '1 second', 'event ' || g FROM generate_series(1, 200000) g;
  CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT);
  INSERT INTO users (email) SELECT 'User' || g || '@Example.com' FROM generate_series(1, 30000) g;

  CREATE INDEX idx_orders_created  ON orders(created_at);
  CREATE INDEX idx_sessions_token  ON sessions USING HASH (token);
  CREATE INDEX idx_products_data   ON products USING GIN (data jsonb_path_ops);
  CREATE INDEX idx_products_tags   ON products USING GIN (tags);
  CREATE INDEX idx_bookings_during ON bookings USING GIST (during);
  CREATE INDEX idx_logs_time       ON logs USING BRIN (logged_at);
  CREATE INDEX idx_orders_pending  ON orders(created_at) WHERE status = 'pending';
  CREATE INDEX idx_users_lower_email ON users (lower(email));
  ANALYZE;
`);

const cases = [
  ['B-Tree: range + ORDER BY', `SELECT * FROM orders WHERE created_at BETWEEN '2026-01-05' AND '2026-01-06' ORDER BY created_at`, 'idx_orders_created'],
  ['Hash: equality only', `SELECT * FROM sessions WHERE token = md5('777')`, 'idx_sessions_token'],
  ['GIN: JSONB containment', `SELECT * FROM products WHERE data @> '{"name": "p42"}'`, 'idx_products_data'],
  ['GIN: array contains', `SELECT * FROM products WHERE tags @> ARRAY['tag5']`, 'idx_products_tags'],
  ['GiST: overlapping ranges', `SELECT * FROM bookings WHERE during && tstzrange('2026-02-01 10:00', '2026-02-01 12:00')`, 'idx_bookings_during'],
  ['BRIN: time range on append-only logs', `SELECT count(*) FROM logs WHERE logged_at BETWEEN '2026-01-02' AND '2026-01-02 01:00'`, 'idx_logs_time'],
  ['Partial: only pending rows indexed', `SELECT * FROM orders WHERE status = 'pending' AND created_at > '2026-01-20'`, 'idx_orders_pending'],
  ['Expression: lower(email)', `SELECT * FROM users WHERE lower(email) = 'user42@example.com'`, 'idx_users_lower_email'],
];
for (const [label, sql, index] of cases) {
  heading(label);
  const plan = await explain(db, sql);
  show('plan', plan);
  assert.ok(plan.includes(index), `${label}: expected ${index}`);
}

heading('Index sizes: BRIN is tiny, partial indexes skip most rows');
const s = await one(db, `SELECT pg_relation_size('idx_logs_time')::int AS brin, pg_relation_size('idx_orders_pending')::int AS partial,
                                pg_relation_size('idx_orders_created')::int AS full_btree`);
show('bytes', s);
assert.ok(s.brin < 50_000 && s.partial < s.full_btree / 10);

heading('A B-Tree cannot serve a function of the column');
const noExpr = await explain(db, `SELECT * FROM orders WHERE date(created_at AT TIME ZONE 'UTC') = '2026-01-05'`);
show('plan', noExpr);
assert.doesNotMatch(noExpr, /idx_orders_created/);

await db.close();
console.log('\nOK');
