// Topic 119: Refresh Tokens  (Full-Stack Handbook, Part 6)
// Run: npm run ex 119        (or: node 119-refresh-tokens.js)
// What it shows: short-lived access token + rotating refresh token in an httpOnly cookie, stored
// hashed. Reusing an already-rotated token is treated as theft: the whole family is revoked.
// An in-memory array stands in for the RefreshToken table.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import cookieParser from 'cookie-parser';
import express from 'express';
import jwt from 'jsonwebtoken';
import { serve } from './lib/serve.js';

const SECRET = 'demo-secret';
const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');
const table = []; // { userId, token (hash), revoked, expiresAt }

function issueRefresh(res, userId) {
  const plain = crypto.randomBytes(40).toString('hex');
  table.push({ userId, token: hash(plain), revoked: false, expiresAt: new Date(Date.now() + 7 * 864e5) });
  res.cookie('refreshToken', plain, { httpOnly: true, secure: true, sameSite: 'strict', path: '/auth' });
}

const app = express();
app.use(cookieParser());
app.post('/auth/login', (req, res) => {
  issueRefresh(res, 42);
  res.json({ accessToken: jwt.sign({ sub: 42 }, SECRET, { expiresIn: '15m' }) });
});
app.post('/auth/refresh', (req, res) => {
  const old = req.cookies.refreshToken;
  // Look it up even if revoked: a revoked token showing up again means it was stolen.
  // (The handbook filters revoked rows out in the query, which hides exactly that reuse.)
  const stored = old && table.find((r) => r.token === hash(old));
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    if (stored) table.filter((r) => r.userId === stored.userId).forEach((r) => (r.revoked = true));
    return res.status(401).json({ error: 'Please log in again' });
  }
  stored.revoked = true; // rotate
  issueRefresh(res, stored.userId);
  res.json({ accessToken: jwt.sign({ sub: stored.userId }, SECRET, { expiresIn: '15m' }) });
});

const { url, close } = await serve(app);
const cookieOf = (res) => res.headers.get('set-cookie')?.split(';')[0]; // "refreshToken=..."
const refresh = (cookie) => fetch(url + '/auth/refresh', { method: 'POST', headers: cookie ? { Cookie: cookie } : {} });

const login = await fetch(url + '/auth/login', { method: 'POST' });
const setCookie = login.headers.get('set-cookie');
console.log('Set-Cookie flags:', setCookie.split('; ').slice(1).join('; '));
assert.match(setCookie, /HttpOnly/);
assert.match(setCookie, /SameSite=Strict/);
const rt1 = cookieOf(login);
assert.ok(!table.some((r) => rt1.includes(r.token)), 'only the hash is stored');

const r1 = await refresh(rt1);
const rt2 = cookieOf(r1);
assert.equal(r1.status, 200);
assert.equal(jwt.verify((await r1.json()).accessToken, SECRET).sub, 42);
assert.notEqual(rt1, rt2, 'refresh token rotated');
console.log('refresh with rt1 -> 200, new access token, rotated to rt2');

// Attacker replays the stolen rt1
const replay = await refresh(rt1);
assert.equal(replay.status, 401);
console.log('replay rt1        ->', replay.status, '(theft detected, family revoked)');

// The legitimate rt2 is now dead too: the user must log in again
const r2 = await refresh(rt2);
assert.equal(r2.status, 401);
assert.ok(table.every((r) => r.revoked));
console.log('refresh with rt2  ->', r2.status, '(every token for user 42 revoked)');

assert.equal((await refresh(null)).status, 401);
await close();
console.log('OK');
