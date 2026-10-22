// Topic 225: Debugging - users logged out after adding a second server  (Full-Stack Handbook, Part 11)
// Run: npm run ex 225        (or: node 225-sessions-shared-store.js)
// What it shows: BUG - two servers with the default in-memory session store: log in on A, the
// load balancer sends the next request to B, and B has never heard of the session (401).
// FIX - both servers use one shared Redis-backed store. A ~15-line store over ioredis-mock stands
// in for connect-redis (same idea: get/set/destroy JSON under "sess:<id>" with a TTL).
import assert from 'node:assert/strict';
import express from 'express';
import session from 'express-session';
import Redis from 'ioredis-mock';
import { serve } from './lib/serve.js';

const SECRET = 'demo-secret';

class RedisStore extends session.Store {
  constructor({ client, ttl = 86400 }) { super(); this.client = client; this.ttl = ttl; }
  get(sid, cb) { this.client.get(`sess:${sid}`).then((v) => cb(null, v ? JSON.parse(v) : null), cb); }
  set(sid, sess, cb) { this.client.set(`sess:${sid}`, JSON.stringify(sess), 'EX', this.ttl).then(() => cb?.(), cb); }
  destroy(sid, cb) { this.client.del(`sess:${sid}`).then(() => cb?.(), cb); }
}

function makeServer(name, store) {
  const app = express();
  // Before: no store option = MemoryStore, private to this process
  app.use(session({ secret: SECRET, resave: false, saveUninitialized: false, ...(store && { store }) }));
  app.post('/login', (req, res) => { req.session.userId = 42; res.json({ server: name }); });
  app.get('/me', (req, res) => req.session.userId
    ? res.json({ server: name, userId: req.session.userId })
    : res.status(401).json({ server: name, error: 'Not logged in' }));
  return app;
}

async function scenario(label, storeA, storeB) {
  const A = await serve(makeServer('A', storeA));
  const B = await serve(makeServer('B', storeB));
  const login = await fetch(A.url + '/login', { method: 'POST' });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const onA = await fetch(A.url + '/me', { headers: { Cookie: cookie } });
  const onB = await fetch(B.url + '/me', { headers: { Cookie: cookie } }); // load balancer picked B
  console.log(`${label}: login on A; /me on A -> ${onA.status}, /me on B -> ${onB.status}`);
  await A.close(); await B.close();
  return [onA.status, onB.status];
}

// BUG: each server has its own MemoryStore
assert.deepEqual(await scenario('BUG (MemoryStore)', null, null), [200, 401]);

// FIX: one shared store (two clients, same Redis)
const shared = (await scenario('FIX (Redis store) ', new RedisStore({ client: new Redis() }), new RedisStore({ client: new Redis() })));
assert.deepEqual(shared, [200, 200]);

const keys = await new Redis().keys('sess:*');
console.log('sessions in Redis:', keys.length, keys[0].slice(0, 16) + '...');
assert.equal(keys.length, 1);
console.log('OK');
