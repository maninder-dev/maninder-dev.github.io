// Topic 118: JWT (JSON Web Tokens)  (Full-Stack Handbook, Part 6)
// Run: npm run ex 118        (or: node 118-jwt.js)
// What it shows: issue a 15-minute token at login, verify it in middleware with no DB lookup, and
// reject missing, tampered and expired tokens. Also: the payload is readable by anyone.
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import { serve } from './lib/serve.js';

const JWT_SECRET = 'demo-secret-use-env-var-in-real-apps';
const user = { id: 7, role: 'editor' };

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

const app = express();
app.post('/login', (req, res) =>
  res.json({ token: jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' }) }));
app.get('/api/me', authenticate, (req, res) => res.json({ sub: req.user.sub, role: req.user.role }));

const { url, close } = await serve(app);
const me = async (token) => {
  const r = await fetch(url + '/api/me', token ? { headers: { Authorization: `Bearer ${token}` } } : {});
  return [r.status, await r.json()];
};

const { token } = await (await fetch(url + '/login', { method: 'POST' })).json();
const [h, p, s] = token.split('.');
console.log('token parts (header.payload.signature):', [h.length, p.length, s.length].join(' / '), 'chars');

// The payload is only base64url-encoded: anyone can read it. Never put secrets in it.
const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
console.log('decoded without the secret:', payload);
assert.equal(payload.sub, 7);
assert.equal(payload.exp - payload.iat, 15 * 60);

assert.deepEqual(await me(token), [200, { sub: 7, role: 'editor' }]);
assert.deepEqual(await me(null), [401, { error: 'Missing token' }]);

// Tamper: promote ourselves to admin. The signature no longer matches.
const forged = [h, Buffer.from(JSON.stringify({ ...payload, role: 'admin' })).toString('base64url'), s].join('.');
assert.deepEqual(await me(forged), [401, { error: 'Invalid or expired token' }]);

// Signed with another key
assert.equal((await me(jwt.sign({ sub: 7 }, 'attacker-key')))[0], 401);

// Expired (exp in the past)
const expired = jwt.sign({ sub: 7, exp: Math.floor(Date.now() / 1000) - 10 }, JWT_SECRET);
assert.throws(() => jwt.verify(expired, JWT_SECRET), { name: 'TokenExpiredError' });
assert.deepEqual(await me(expired), [401, { error: 'Invalid or expired token' }]);
console.log('valid -> 200; missing, forged, wrong key, expired -> 401');

await close();
console.log('OK');
