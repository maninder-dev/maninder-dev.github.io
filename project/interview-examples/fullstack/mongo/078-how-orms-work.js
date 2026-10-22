// Topic 78: How ORMs Work Internally  (Full-Stack Handbook, Part 4)
// Run: npm run ex 78        (or: node 078-how-orms-work.js)
// What it shows: a 40-line toy ORM that walks the 8 steps (metadata, query object, dialect SQL,
// parameter binding, pool checkout, execution, hydration, release) against PGlite, then Drizzle
// compiling one query object to PostgreSQL ($1, "quotes") and MySQL (?, `backticks`).
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { QueryBuilder as PgQB, pgTable, serial, text } from 'drizzle-orm/pg-core';
import { QueryBuilder as MyQB, mysqlTable, int, varchar } from 'drizzle-orm/mysql-core';
import { section } from './lib/db.js';

const steps = [];
const step = (n, msg) => steps.push(n) && console.log(`  ${n}. ${msg}`);

// Dialects only differ in quoting and placeholders.
const dialects = {
  postgres: { q: (id) => `"${id}"`, ph: (i) => `$${i}` },
  mysql: { q: (id) => `\`${id}\``, ph: () => '?' },
};

class Pool { // a 1-connection pool around PGlite
  constructor(conn) { this.free = [conn]; }
  async acquire() { return this.free.pop(); }
  release(c) { this.free.push(c); }
}

function defineModel(pool, dialect, meta) {
  return {
    async findOne({ where }) {
      step(1, `interception: table=${meta.table}, columns=${Object.keys(meta.columns)}`);
      const query = { type: 'SELECT', table: meta.table, where, limit: 1 };
      step(2, `query object ${JSON.stringify(query)}`);
      const d = dialects[dialect];
      const keys = Object.keys(where);
      const text = `SELECT * FROM ${d.q(meta.table)} WHERE ${keys.map((k, i) => `${d.q(k)} = ${d.ph(i + 1)}`).join(' AND ')} LIMIT 1`;
      step(3, `SQL (${dialect}): ${text}`);
      const params = keys.map((k) => where[k]);
      step(4, `params bound separately: ${JSON.stringify(params)}`);
      const conn = await pool.acquire();
      step(5, 'connection borrowed from pool');
      try {
        const { rows } = await conn.query(text, params);
        step(6, `executed, raw row: ${JSON.stringify(rows[0])}`);
        if (!rows[0]) return null;
        const inst = Object.create({ save() { return 'would UPDATE by primary key'; } });
        for (const [col, type] of Object.entries(meta.columns)) inst[col] = type === 'date' ? new Date(rows[0][col]) : rows[0][col];
        step(7, 'hydrated into a model instance (string -> Date, methods attached)');
        return inst;
      } finally {
        pool.release(conn);
        step(8, 'connection released');
      }
    },
  };
}

const pg = new PGlite();
await pg.exec(`CREATE TABLE users (id serial PRIMARY KEY, email text, joined text);
  INSERT INTO users (email, joined) VALUES ('alice@example.com', '2026-01-02T03:04:05Z');`);

section("Toy ORM: User.findOne({ where: { email } })");
const User = defineModel(new Pool(pg), 'postgres', { table: 'users', columns: { id: 'int', email: 'text', joined: 'date' } });
const alice = await User.findOne({ where: { email: 'alice@example.com' } });
assert.deepEqual(steps, [1, 2, 3, 4, 5, 6, 7, 8]);
assert.ok(alice.joined instanceof Date);
assert.equal(typeof alice.save, 'function');

section('Same query in the MySQL dialect (SQL text only)');
steps.length = 0;
const mysqlSql = (() => {
  const d = dialects.mysql;
  return `SELECT * FROM ${d.q('users')} WHERE ${d.q('email')} = ${d.ph(1)} LIMIT 1`;
})();
console.log(' ', mysqlSql);
assert.equal(mysqlSql, 'SELECT * FROM `users` WHERE `email` = ? LIMIT 1');

section('A real ORM does the same: Drizzle compiling per dialect');
const pgUsers = pgTable('users', { id: serial('id').primaryKey(), email: text('email') });
const myUsers = mysqlTable('users', { id: int('id').primaryKey(), email: varchar('email', { length: 255 }) });
const pgQ = new PgQB().select().from(pgUsers).where(eq(pgUsers.email, 'alice@example.com')).limit(1).toSQL();
const myQ = new MyQB().select().from(myUsers).where(eq(myUsers.email, 'alice@example.com')).limit(1).toSQL();
console.log('  postgres:', pgQ.sql, pgQ.params);
console.log('  mysql:   ', myQ.sql, myQ.params);
assert.match(pgQ.sql, /"users"\."email" = \$1 limit \$2/);
assert.match(myQ.sql, /`users`\.`email` = \? limit \?/);
assert.deepEqual(pgQ.params, ['alice@example.com', 1]);

await pg.close();
console.log('\nOK');
