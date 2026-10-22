// Topic 215: Authentication - sessions vs JWT, and where to keep tokens  (Full-Stack Handbook, Part 11)
// Run: npm run ex 215        (or: node 215-sessions-vs-jwt.js)
// What it shows: a server-side session (cookie holds only an ID) is revoked instantly on logout; a JWT
// keeps working after "logout" until it expires. The hybrid fix: a short-lived access JWT plus a refresh
// token in an httpOnly, Secure, SameSite=Strict cookie that is rotated and revocable.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { listen } from './lib.js';

const SECRET = 'demo-only-secret-do-not-use';
const sessions = new Map();          // in production: Redis (shared by all app servers)
const refreshTokens = new Map();     // token -> userId (in production: a table, stored hashed)

const app = express();
app.use(cookieParser());
const cookieOpts = { httpOnly: true, secure: true, sameSite: 'strict' };

// --- Sessions ---
app.post('/session/login', (req, res) => {
  const sid = randomBytes(24).toString('base64url');
  sessions.set(sid, { userId: 7 });
  res.cookie('sid', sid, cookieOpts).json({ ok: true });
});
app.get('/session/me', (req, res) => {
  const s = sessions.get(req.cookies.sid);
  return s ? res.json(s) : res.status(401).json({ error: 'not logged in' });
});
app.post('/session/logout', (req, res) => { sessions.delete(req.cookies.sid); res.clearCookie('sid').json({ ok: true }); });

// --- JWT access token + rotating refresh token ---
app.post('/jwt/login', (req, res) => {
  const access = jwt.sign({ sub: 7 }, SECRET, { expiresIn: '15m' });
  const refresh = randomBytes(32).toString('base64url');
  refreshTokens.set(refresh, 7);
  res.cookie('refreshToken', refresh, { ...cookieOpts, path: '/jwt/refresh', maxAge: 7 * 24 * 3600 * 1000 }).json({ access });
});
app.get('/jwt/me', (req, res) => {
  try { res.json(jwt.verify(req.get('authorization')?.replace('Bearer ', ''), SECRET)); }
  catch (e) { res.status(401).json({ error: e.name }); }
});
app.post('/jwt/refresh', (req, res) => {
  const userId = refreshTokens.get(req.cookies.refreshToken);
  if (!userId) return res.status(401).json({ error: 'refresh token invalid or reused' });
  refreshTokens.delete(req.cookies.refreshToken);           // rotation: each refresh token works once
  const refresh = randomBytes(32).toString('base64url');
  refreshTokens.set(refresh, userId);
  res.cookie('refreshToken', refresh, { ...cookieOpts, path: '/jwt/refresh' }).json({ access: jwt.sign({ sub: userId }, SECRET, { expiresIn: '15m' }) });
});
app.post('/jwt/logout', (req, res) => { refreshTokens.delete(req.cookies.refreshToken); res.json({ ok: true }); });
const { url, close } = await listen(app);

const cookieOf = (r, name) => r.headers.getSetCookie().find((c) => c.startsWith(name + '='));
const req = (method, path, headers = {}) => fetch(url + path, { method, headers });

// Sessions: logout revokes immediately
let r = await req('POST', '/session/login');
const sidCookie = cookieOf(r, 'sid');
console.log('session cookie :', sidCookie);
assert.match(sidCookie, /HttpOnly/);
assert.match(sidCookie, /Secure/);
assert.match(sidCookie, /SameSite=Strict/);
const sid = sidCookie.split(';')[0];
assert.equal((await req('GET', '/session/me', { cookie: sid })).status, 200);
await req('POST', '/session/logout', { cookie: sid });
assert.equal((await req('GET', '/session/me', { cookie: sid })).status, 401);
console.log('session        : after logout the same cookie -> 401 (state lives on the server)');

// JWT: the token is self-contained, logout can't take it back
r = await req('POST', '/jwt/login');
const { access } = await r.json();
let refresh = cookieOf(r, 'refreshToken');
console.log('refresh cookie :', refresh.replace(/=[^;]+/, '=...'));
assert.match(refresh, /HttpOnly/);
assert.match(refresh, /Path=\/jwt\/refresh/, 'only sent to the refresh endpoint');
console.log('JWT payload    :', JSON.parse(Buffer.from(access.split('.')[1], 'base64url')), '(readable by anyone - never put secrets in it)');
refresh = refresh.split(';')[0];
await req('POST', '/jwt/logout', { cookie: refresh });
assert.equal((await req('GET', '/jwt/me', { authorization: `Bearer ${access}` })).status, 200);
console.log('JWT            : after logout the access token still works -> keep it short-lived');

// Expired and tampered tokens fail
const expired = jwt.sign({ sub: 7, exp: Math.floor(Date.now() / 1000) - 10 }, SECRET);
assert.deepEqual(await (await req('GET', '/jwt/me', { authorization: `Bearer ${expired}` })).json(), { error: 'TokenExpiredError' });
const [h, , s] = access.split('.');
const forged = `${h}.${Buffer.from(JSON.stringify({ sub: 1, role: 'admin' })).toString('base64url')}.${s}`;
assert.equal((await req('GET', '/jwt/me', { authorization: `Bearer ${forged}` })).status, 401);
console.log('JWT            : expired -> 401, edited payload -> 401 (signature mismatch)');

// Refresh token rotation and revocation
r = await req('POST', '/jwt/login');
const rt1 = cookieOf(r, 'refreshToken').split(';')[0];
r = await req('POST', '/jwt/refresh', { cookie: rt1 });
assert.equal(r.status, 200);
const rt2 = cookieOf(r, 'refreshToken').split(';')[0];
assert.notEqual(rt1, rt2);
assert.equal((await req('POST', '/jwt/refresh', { cookie: rt1 })).status, 401, 'a stolen, already-used refresh token is useless');
await req('POST', '/jwt/logout', { cookie: rt2 });
assert.equal((await req('POST', '/jwt/refresh', { cookie: rt2 })).status, 401, 'logout revokes the refresh token');
console.log('refresh        : rotated on use, old one rejected, revoked on logout');

await close();
console.log('OK: sessions revoke instantly; JWTs need short expiry + revocable refresh tokens');
