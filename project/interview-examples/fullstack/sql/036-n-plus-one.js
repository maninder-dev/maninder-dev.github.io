// Topic 36: Avoiding N+1 Queries in SQL  (Full-Stack Handbook, Part 2)
// Run: npm run ex 36       (or: node 036-n-plus-one.js)
// What it shows: loading 100 users with their posts. The loop runs 101 queries; ANY($1) runs 2; a
// JOIN with json_agg runs 1. A query counter wraps the client so the numbers are measured.
import assert from 'node:assert/strict';
import { createDb, heading, show } from './lib/db.js';

const raw = await createDb();
await raw.exec(`
  CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
  CREATE TABLE posts (id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id), title TEXT NOT NULL);
  INSERT INTO users (name) SELECT 'User ' || g FROM generate_series(1, 1000) g;
  INSERT INTO posts (user_id, title) SELECT 1 + g % 1000, 'Post ' || g FROM generate_series(1, 20000) g;
  CREATE INDEX ON posts(user_id);
`);
let count = 0;
const db = { query: (sql, p) => { count++; return raw.query(sql, p); } };
async function measure(label, fn) {
  count = 0;
  const t = performance.now();
  const users = await fn();
  show(label, `${count} queries, ${(performance.now() - t).toFixed(1)} ms, ${users.reduce((n, u) => n + u.posts.length, 0)} posts`);
  return { users, queries: count };
}

heading('Three ways to load 100 users with their posts');
const n1 = await measure('N+1 loop      ', async () => {
  const users = (await db.query('SELECT id, name FROM users ORDER BY id LIMIT 100')).rows;
  for (const u of users) u.posts = (await db.query('SELECT * FROM posts WHERE user_id = $1 ORDER BY id', [u.id])).rows;
  return users;
});
const batched = await measure('ANY($1) batch ', async () => {
  const users = (await db.query('SELECT id, name FROM users ORDER BY id LIMIT 100')).rows;
  const ids = users.map((u) => u.id);
  const posts = (await db.query('SELECT * FROM posts WHERE user_id = ANY($1) ORDER BY id', [ids])).rows;
  const byUser = Map.groupBy(posts, (p) => p.user_id);
  for (const u of users) u.posts = byUser.get(u.id) ?? [];
  return users;
});
const joined = await measure('JOIN json_agg ', async () => (await db.query(`
  SELECT u.id, u.name, json_agg(p ORDER BY p.id) AS posts
  FROM (SELECT * FROM users ORDER BY id LIMIT 100) u JOIN posts p ON p.user_id = u.id
  GROUP BY u.id, u.name ORDER BY u.id`)).rows);

assert.equal(n1.queries, 101);
assert.equal(batched.queries, 2);
assert.equal(joined.queries, 1);
assert.deepEqual(batched.users.map((u) => u.posts.length), n1.users.map((u) => u.posts.length), 'same data');
assert.deepEqual(joined.users.map((u) => u.posts.length), n1.users.map((u) => u.posts.length));
console.log('\nOver a network each query also pays a round trip (~0.5-1 ms), so 101 queries hurt far more there.');

await raw.close();
console.log('\nOK');
