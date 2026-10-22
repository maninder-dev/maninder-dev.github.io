// Topic 76: Pros and Cons of ORMs  (Full-Stack Handbook, Part 4)
// Run: npm run ex 76        (or: node 076-orm-pros-and-cons.js)
// What it shows (Drizzle on PGlite): pros - one-line CRUD and injection-safe parameters (vs a
// concatenated raw query that leaks every row); cons - verbose generated SQL for relations and
// no builder API for window functions, so you drop to sql``.
import assert from 'node:assert/strict';
import { eq, sql } from 'drizzle-orm';
import { startPg, section } from './lib/db.js';
import { schema, users, posts, createTables, seed } from './lib/pg-schema.js';

const pg = await startPg(schema);
const { db, client, queries } = pg;
await createTables(client);
await seed(db, 5);

section('PRO: less boilerplate - insert and get the typed row back');
const [created] = await db.insert(users).values({ name: 'Zed', email: 'zed@example.com' }).returning();
console.log(created);
assert.equal(created.id, 6);

section('PRO: parameterized by default - SQL injection blocked');
const evil = "nobody' OR '1'='1";
const unsafe = await client.query(`SELECT id FROM users WHERE email = '${evil}'`); // string concatenation: DON'T
const safe = await db.select({ id: users.id }).from(users).where(eq(users.email, evil));
console.log('concatenated raw SQL returned', unsafe.rows.length, 'rows; ORM returned', safe.length);
assert.equal(unsafe.rows.length, 6); // every user leaked
assert.equal(safe.length, 0);
// The sql`` escape hatch is parameterized too: interpolations become $1, $2...
const viaTemplate = await db.execute(sql`SELECT id FROM users WHERE email = ${evil}`);
assert.equal(viaTemplate.rows.length, 0);

section('PRO: type safety (TypeScript)');
// const [u] = await db.select().from(users);  u.name  -> string
// u.nmae                                      -> TS error: Property 'nmae' does not exist
assert.equal(users.nmae, undefined); // in plain JS you only find out at runtime
console.log('in TS, a misspelt column is a compile error; in JS it is undefined at runtime');

section('CON: generated SQL can be heavier than what you would write');
queries.length = 0;
await db.query.users.findMany({ columns: { name: true }, with: { posts: { columns: { title: true } } } });
const generated = queries[0].sql;
const handWritten = 'SELECT u.name, p.title FROM users u LEFT JOIN posts p ON p.user_id = u.id';
console.log('ORM:\n ', generated);
console.log('by hand:\n ', handWritten);
assert.ok(generated.length > handWritten.length * 1.5);

section('CON: window functions -> no builder API, drop to sql``');
const ranked = await db
  .select({
    title: posts.title,
    userId: posts.userId,
    rank: sql`row_number() over (partition by ${posts.userId} order by ${posts.id} desc)`.mapWith(Number).as('rank'),
  })
  .from(posts)
  .where(eq(posts.userId, 1));
console.table(ranked);
assert.deepEqual(ranked.map((r) => r.rank).sort(), [1, 2, 3]);

await pg.stop();
console.log('\nOK');
