// Topic 96: Redis as a Read Cache (Cache-Aside)  (Full-Stack Handbook, Part 5)
// Run: npm run ex 96       (or: node 096-redis-cache-aside.js)
// What it shows: the handbook's getUser / updateUser with a 300 s TTL (PostgreSQL via PGlite, Redis
// via ioredis-mock), then a cache stampede - 50 concurrent misses on a hot key hit the database 50
// times - fixed with a short Redis lock (SET NX PX) so only one request refills. Plus TTL jitter.
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import Redis from 'ioredis-mock';
import { createDb, heading, show } from './lib/db.js';

const db = await createDb();
const redis = new Redis();
await db.exec(`CREATE TABLE users (id INT PRIMARY KEY, name TEXT NOT NULL);
               INSERT INTO users SELECT g, 'User ' || g FROM generate_series(1, 1000) g;`);
let dbHits = 0;
const User = {
  findByPk: async (id) => { dbHits++; await sleep(5); return (await db.query('SELECT * FROM users WHERE id = $1', [id])).rows[0]; },
  update: (data, { where }) => db.query('UPDATE users SET name = $1 WHERE id = $2', [data.name, where.id]),
};

async function getUser(id) {
  const key = `user:${id}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached); // cache hit
  const user = await User.findByPk(id); // cache miss
  if (user) await redis.set(key, JSON.stringify(user), 'EX', 300); // TTL 5 min
  return user;
}
async function updateUser(id, data) {
  await User.update(data, { where: { id } });
  await redis.del(`user:${id}`); // invalidate
}

heading('Hit, miss, invalidate');
await getUser(1); await getUser(1);
show('2 reads -> DB hits', dbHits);
assert.equal(dbHits, 1);
await updateUser(1, { name: 'Ann' });
show('read after update', (await getUser(1)).name);
assert.equal((await getUser(1)).name, 'Ann');
assert.equal(dbHits, 2);

heading('Stampede: hot key expires, 50 requests arrive at once');
dbHits = 0;
await Promise.all(Array.from({ length: 50 }, () => getUser(7)));
show('DB hits', dbHits);
assert.equal(dbHits, 50);

heading('Fix: one request takes a short lock and refills; the rest wait briefly and re-read');
async function getUserLocked(id) {
  const key = `user:${id}`;
  for (let attempt = 0; attempt < 50; attempt++) {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
    const gotLock = await redis.set(`lock:${key}`, '1', 'PX', 2000, 'NX');
    if (gotLock === 'OK') {
      try {
        const user = await User.findByPk(id);
        const ttl = 300 + Math.floor(Math.random() * 60); // jitter: hot keys don't all expire together
        await redis.set(key, JSON.stringify(user), 'EX', ttl);
        return user;
      } finally { await redis.del(`lock:${key}`); }
    }
    await sleep(2);
  }
  return User.findByPk(id); // give up waiting, fall back to the DB
}
dbHits = 0;
const users = await Promise.all(Array.from({ length: 50 }, () => getUserLocked(8)));
show('DB hits', dbHits);
assert.equal(dbHits, 1);
assert.ok(users.every((u) => u.name === 'User 8'));
const ttl = await redis.ttl('user:8');
show('TTL with jitter (300-359 s)', ttl);
assert.ok(ttl >= 299 && ttl < 360);

redis.disconnect();
await db.close();
console.log('\nOK');
