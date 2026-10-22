// Topic 79: Migrations  (Full-Stack Handbook, Part 4)
// Run: npm run ex 79        (or: node 079-migrations.js)
// What it shows: a hand-written migration runner on PGlite: ordered up/down migrations, a
// schema_migrations table recording what ran, each migration in its own transaction, a failing
// migration rolling back cleanly, and rollback of the last batch. drizzle-kit / prisma migrate /
// sequelize-cli do the same bookkeeping (commands in comments).
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { section } from './lib/db.js';

const migrations = [
  {
    name: '001_create_users',
    up: 'CREATE TABLE users (id serial PRIMARY KEY, email text NOT NULL UNIQUE)',
    down: 'DROP TABLE users',
  },
  {
    name: '002_add_phone', // the handbook's Sequelize example: addColumn + addIndex
    up: 'ALTER TABLE users ADD COLUMN phone varchar(20); CREATE INDEX users_phone_idx ON users(phone)',
    down: 'DROP INDEX users_phone_idx; ALTER TABLE users DROP COLUMN phone',
  },
];

async function migrate(db, list) {
  await db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, batch int, run_at timestamptz DEFAULT now())');
  const done = new Set((await db.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  const { rows: [{ b }] } = await db.query('SELECT COALESCE(MAX(batch), 0) + 1 AS b FROM schema_migrations');
  const applied = [];
  for (const m of list) {
    if (done.has(m.name)) continue;
    await db.transaction(async (tx) => { // PostgreSQL has transactional DDL
      await tx.exec(m.up);
      await tx.query('INSERT INTO schema_migrations (name, batch) VALUES ($1, $2)', [m.name, b]);
    });
    applied.push(m.name);
  }
  return applied;
}

async function rollback(db, list) {
  const { rows } = await db.query('SELECT name FROM schema_migrations WHERE batch = (SELECT MAX(batch) FROM schema_migrations) ORDER BY name DESC');
  for (const { name } of rows) {
    const m = list.find((x) => x.name === name);
    await db.transaction(async (tx) => {
      await tx.exec(m.down);
      await tx.query('DELETE FROM schema_migrations WHERE name = $1', [name]);
    });
  }
  return rows.map((r) => r.name);
}

const columns = async (db) => (await db.query(
  "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position")).rows.map((r) => r.column_name);

const db = new PGlite();

section('migrate (like: npx prisma migrate deploy / npx drizzle-kit migrate)');
console.log('applied:', await migrate(db, migrations));
assert.deepEqual(await columns(db), ['id', 'email', 'phone']);

section('run again: nothing pending (idempotent)');
assert.deepEqual(await migrate(db, migrations), []);
console.log('applied: []');

section('a broken migration rolls back as a whole');
const broken = { name: '003_bad', up: "ALTER TABLE users ADD COLUMN age int; ALTER TABLE nope ADD COLUMN x int", down: '' };
await assert.rejects(() => migrate(db, [...migrations, broken]), /nope/);
assert.deepEqual(await columns(db), ['id', 'email', 'phone']); // "age" was not left behind
assert.equal((await db.query("SELECT 1 FROM schema_migrations WHERE name = '003_bad'")).rows.length, 0);
console.log('003_bad failed; "age" column not created, not recorded');

section('add a fixed migration, then roll back the last batch');
const fixed = { name: '003_add_age', up: 'ALTER TABLE users ADD COLUMN age int', down: 'ALTER TABLE users DROP COLUMN age' };
console.log('applied:', await migrate(db, [...migrations, fixed]));
assert.deepEqual(await columns(db), ['id', 'email', 'phone', 'age']);
console.log('rolled back:', await rollback(db, [...migrations, fixed]));
assert.deepEqual(await columns(db), ['id', 'email', 'phone']);
console.table((await db.query('SELECT name, batch FROM schema_migrations ORDER BY name')).rows);

/* Tool equivalents:
   npx drizzle-kit generate   # diff schema.ts against the last snapshot -> drizzle/0001_x.sql
   npx drizzle-kit migrate    # apply pending files, tracked in __drizzle_migrations
   npx prisma migrate dev --name add_phone   /   npx prisma migrate deploy
   npx sequelize-cli db:migrate              /   npx sequelize-cli db:migrate:undo
*/
await db.close();
console.log('\nOK');
