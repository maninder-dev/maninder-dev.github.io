// Topic 80-81: Lazy vs Eager Loading / The N+1 Problem in ORMs  (Full-Stack Handbook, Part 4)
// Run: npm run ex 80        (or: node 080-081-lazy-eager-n-plus-1.js)
// What it shows: every query is logged and counted. Lazy loading in a loop = 1 + N queries;
// eager loading (Drizzle relational query, a JOIN, or a batched IN) = 1-2; a DataLoader-style
// batcher turns N lookups in one tick into 1; Mongoose populate() = 2 queries.
// Drizzle has no lazy proxies, so user.getPosts() mimics Sequelize's lazy accessor.
import assert from 'node:assert/strict';
import { eq, inArray } from 'drizzle-orm';
import { startPg, withMongoose, section } from './lib/db.js';
import { schema, users, posts, createTables, seed } from './lib/pg-schema.js';

const pg = await startPg(schema);
const { db, client } = pg;
await createTables(client);
await seed(db, 10); // 10 users x 3 posts

// Sequelize-style lazy accessor: the query runs only when you call it.
const withLazyPosts = (u) => ({ ...u, getPosts: () => db.select().from(posts).where(eq(posts.userId, u.id)) });

section('BAD: lazy loading inside a loop (N+1)');
const lazy = await pg.count(async () => {
  const all = (await db.select().from(users)).map(withLazyPosts);
  let total = 0;
  for (const u of all) total += (await u.getPosts()).length; // one query per user
  return total;
});
console.log(`${lazy.result} posts with ${lazy.n} queries`);
console.log('  ', lazy.sql[0], '\n  ', lazy.sql[1], '  <- repeated', lazy.n - 1, 'times with different ids');
assert.equal(lazy.n, 11);
assert.equal(new Set(lazy.sql.slice(1)).size, 1); // the tell-tale: same SQL, different params

section('GOOD: eager, Drizzle relational query (like Prisma include / Sequelize include)');
const eager = await pg.count(() => db.query.users.findMany({ with: { posts: true } }));
console.log(`${eager.result.flatMap((u) => u.posts).length} posts with ${eager.n} query`);
assert.equal(eager.n, 1);

section('GOOD: eager with an explicit LEFT JOIN');
const joined = await pg.count(() => db.select({ user: users.name, title: posts.title }).from(users).leftJoin(posts, eq(posts.userId, users.id)));
console.log(`${joined.result.length} rows with ${joined.n} query:`, joined.sql[0]);
assert.equal(joined.n, 1);

section('GOOD: two queries, second one batched with IN (what populate/DataLoader do)');
const batched = await pg.count(async () => {
  const us = await db.select().from(users);
  const ps = await db.select().from(posts).where(inArray(posts.userId, us.map((u) => u.id)));
  return us.map((u) => ({ ...u, posts: ps.filter((p) => p.userId === u.id) }));
});
assert.equal(batched.n, 2);
assert.equal(batched.result.flatMap((u) => u.posts).length, 30);
console.log('30 posts with 2 queries');

section('DataLoader idea: collect keys requested in the same tick, load once');
function makeLoader(batchFn) {
  let queue = null;
  return (key) => {
    if (!queue) {
      queue = new Map();
      const q = queue;
      queueMicrotask(async () => {
        queue = null;
        const rows = await batchFn([...q.keys()]);
        for (const [k, { resolve }] of q) resolve(rows.filter((r) => r.userId === k));
      });
    }
    return new Promise((resolve) => queue.set(key, { resolve }));
  };
}
const loadPosts = makeLoader((ids) => db.select().from(posts).where(inArray(posts.userId, ids)));
const viaLoader = await pg.count(async () => {
  const us = await db.select().from(users);
  return Promise.all(us.map((u) => loadPosts(u.id))); // looks like N calls (e.g. GraphQL resolvers)
});
console.log(`${viaLoader.result.flat().length} posts, ${viaLoader.n} queries`);
assert.equal(viaLoader.n, 2);
await pg.stop();

section('Mongoose: populate() = 1 query + 1 batched $in query');
await withMongoose({}, async ({ mongoose }) => {
  const ops = [];
  mongoose.set('debug', (coll, method, query) => ops.push(`${coll}.${method} ${JSON.stringify(query)}`));
  const User = mongoose.model('User', new mongoose.Schema({ name: String }));
  const Post = mongoose.model('Post', new mongoose.Schema({ title: String, author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }));
  const us = await User.insertMany([{ name: 'a' }, { name: 'b' }, { name: 'c' }]);
  await Post.insertMany(us.flatMap((u) => [{ title: 'x', author: u._id }, { title: 'y', author: u._id }]));
  ops.length = 0;
  const ps = await Post.find().populate('author', 'name');
  console.log(ops.map((o) => o.slice(0, 80)));
  assert.equal(ops.length, 2);
  assert.match(ops[1], /users\.find .*\$in/);
  assert.equal(ps[0].author.name, 'a');
});
console.log('\nOK');
