// Topic 101: Design: Social Media Feed  (Full-Stack Handbook, Part 5)
// Run: npm run ex 101      (or: node 101-social-feed.js)
// What it shows: pull (fan-out on read: the handbook's JOIN query on PostgreSQL), push (fan-out on
// write: LPUSH + LTRIM into Redis lists via ioredis-mock) and the hybrid that pulls celebrity posts
// at read time. Counts the write amplification a celebrity causes under pure push.
import assert from 'node:assert/strict';
import Redis from 'ioredis-mock';
import { createDb, all, explain, heading, show } from './lib/db.js';

const db = await createDb();
const redis = new Redis();
await db.exec(`
  CREATE TABLE users (id INT PRIMARY KEY, name TEXT NOT NULL, is_celebrity BOOLEAN NOT NULL DEFAULT false);
  CREATE TABLE follows (follower_id INT NOT NULL, following_id INT NOT NULL, PRIMARY KEY (follower_id, following_id));
  CREATE TABLE posts (id SERIAL PRIMARY KEY, user_id INT NOT NULL, body TEXT, created_at TIMESTAMPTZ NOT NULL);
  INSERT INTO users SELECT g, 'user' || g, g = 1 FROM generate_series(1, 3000) g;      -- user 1 is a celebrity
  INSERT INTO follows SELECT g, 1 FROM generate_series(2, 3000) g;                     -- everyone follows user 1
  INSERT INTO follows SELECT g, 2 + (g * 7 + k) % 2999 FROM generate_series(2, 3000) g, generate_series(1, 20) k
    ON CONFLICT DO NOTHING;
  INSERT INTO posts (user_id, body, created_at)
    SELECT 2 + g % 2999, 'post ' || g, now() - g * interval '1 minute' FROM generate_series(1, 30000) g;
  CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);
  CREATE INDEX idx_follows_follower ON follows(follower_id);
  ANALYZE;
`);
const pullSql = `SELECT p.id, p.created_at, u.name FROM posts p
  JOIN follows f ON f.following_id = p.user_id JOIN users u ON u.id = p.user_id
  WHERE f.follower_id = $1 ORDER BY p.created_at DESC LIMIT 20`;

heading('Pull: build the feed at request time');
const pulled = await all(db, pullSql, [42]);
show('user 42 feed (first 3)', pulled.slice(0, 3));
assert.equal(pulled.length, 20);
show('plan', await explain(db, pullSql.replace('$1', '42')));

heading('Push: on a new post, write its id into every follower\'s Redis list (capped at 500)');
async function fanOut(authorId, postId) {
  const followers = (await db.query('SELECT follower_id FROM follows WHERE following_id = $1', [authorId])).rows;
  const pipe = redis.pipeline();
  for (const { follower_id: f } of followers) pipe.lpush(`feed:${f}`, postId).ltrim(`feed:${f}`, 0, 499);
  await pipe.exec();
  return followers.length;
}
const normalPost = (await db.query(`INSERT INTO posts (user_id, body, created_at) VALUES (5, 'hi', now()) RETURNING id`)).rows[0].id;
const normalWrites = await fanOut(5, normalPost);
const celebPost = (await db.query(`INSERT INTO posts (user_id, body, created_at) VALUES (1, 'big news', now()) RETURNING id`)).rows[0].id;
const celebWrites = await fanOut(1, celebPost);
show('Redis writes for a normal user\'s post', normalWrites);
show('Redis writes for the celebrity\'s post', celebWrites);
assert.ok(celebWrites > normalWrites * 50);
const feed42 = await redis.lrange('feed:42', 0, 19);
show('user 42 feed read: one LRANGE', feed42);
assert.equal(feed42[0], String(celebPost));

heading('Hybrid: push for normal users, pull celebrity posts at read time and merge');
await redis.flushall();
async function onPost(authorId, postId) {
  const celeb = (await db.query('SELECT is_celebrity FROM users WHERE id = $1', [authorId])).rows[0].is_celebrity;
  return celeb ? 0 : fanOut(authorId, postId);
}
async function hybridFeed(userId) {
  const pushed = (await redis.lrange(`feed:${userId}`, 0, 19)).map(Number);
  const celebPosts = (await db.query(`SELECT p.id FROM posts p JOIN follows f ON f.following_id = p.user_id
    JOIN users u ON u.id = p.user_id WHERE f.follower_id = $1 AND u.is_celebrity ORDER BY p.created_at DESC LIMIT 20`, [userId])).rows.map((r) => r.id);
  return [...new Set([...celebPosts, ...pushed])].sort((a, b) => b - a).slice(0, 20); // ids grow with time
}
show('writes for celebrity post under hybrid', await onPost(1, celebPost));
await onPost(5, normalPost);
const merged = await hybridFeed(42);
show('user 42 hybrid feed (first 5 ids)', merged.slice(0, 5));
assert.ok(merged.includes(celebPost));

redis.disconnect();
await db.close();
console.log('\nOK');
