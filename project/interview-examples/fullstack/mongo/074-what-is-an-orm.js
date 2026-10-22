// Topic 74: What is an ORM?  (Full-Stack Handbook, Part 4)
// Run: npm run ex 74        (or: node 074-what-is-an-orm.js)
// What it shows: the same lookup as raw SQL and through Drizzle ORM (on PGlite, real PostgreSQL in
// WASM), the parameterized SQL the ORM writes, and the typed objects it hands back.
// Sequelize/Prisma equivalents are shown in comments rather than installed.
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { startPg, section } from './lib/db.js';
import { schema, users, createTables, seed } from './lib/pg-schema.js';

const pg = await startPg(schema);
const { db, client, queries } = pg;
await createTables(client);
await seed(db, 3);

section('Raw SQL: you write the query, you get plain rows');
const { rows } = await client.query('SELECT * FROM users WHERE email = $1', ['user1@example.com']);
console.log(rows[0]);
assert.equal(rows[0].name, 'user1');
assert.ok('password_hash' in rows[0]); // snake_case column names straight from the table

section('ORM: call methods, it writes the SQL and maps the result');
queries.length = 0;
const [user] = await db.select().from(users).where(eq(users.email, 'user1@example.com')).limit(1);
console.log('generated:', queries[0].sql);
console.log('params:   ', queries[0].params);
console.log('object:   ', user);
assert.match(queries[0].sql, /where "users"\."email" = \$1 limit \$2/);
assert.deepEqual(queries[0].params, ['user1@example.com', 1]); // value travels separately
assert.ok(user.createdAt instanceof Date); // column -> camelCase property, timestamp -> Date
assert.equal(user.passwordHash, 'x');

section('Relational query API (like Prisma include)');
const withPosts = await db.query.users.findFirst({ where: eq(users.id, 1), with: { posts: true } });
console.log(withPosts.name, '->', withPosts.posts.map((p) => p.title));
assert.equal(withPosts.posts.length, 3);

/* The same lookup in other ORMs:
   // Sequelize
   const user = await User.findOne({ where: { email: 'alice@example.com' } });
   // Prisma
   const user = await prisma.user.findUnique({ where: { email: 'alice@example.com' } });
   // TypeORM
   const user = await userRepo.findOneBy({ email: 'alice@example.com' });
*/
await pg.stop();
console.log('\nOK');
