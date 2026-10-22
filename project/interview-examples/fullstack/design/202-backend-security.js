// Topic 202: Security Best Practices for Back Ends  (Full-Stack Handbook, Part 10)
// Run: npm run ex 202        (or: node 202-backend-security.js)
// What it shows: the handbook's middleware stack actually working - helmet headers, CORS limited to one
// origin, a login rate limit returning 429, zod input validation - plus SQL injection vs a
// parameterized query on a real (in-process) PostgreSQL via PGlite.
import assert from 'node:assert/strict';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { PGlite } from '@electric-sql/pglite';
import { listen } from './lib.js';

const app = express();
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } } }));
app.use(cors({ origin: ['https://app.example.com'], credentials: true }));
app.use(express.json());
app.use('/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false }));

const Login = z.object({ email: z.email(), password: z.string().min(8).max(200) });
app.post('/auth/login', (req, res) => {
  const parsed = Login.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ errors: z.flattenError(parsed.error).fieldErrors });
  res.status(401).json({ error: 'Invalid email or password' }); // same message either way: no user enumeration
});
const { url, close } = await listen(app);

// 1. Security headers from helmet
let r = await fetch(`${url}/auth/login`, { method: 'POST' });
const h = Object.fromEntries(['content-security-policy', 'x-content-type-options', 'strict-transport-security', 'x-powered-by'].map((k) => [k, r.headers.get(k)]));
console.log('helmet headers:', h);
assert.match(h['content-security-policy'], /default-src 'self'/);
assert.equal(h['x-content-type-options'], 'nosniff');
assert.ok(h['strict-transport-security']);
assert.equal(h['x-powered-by'], null, 'X-Powered-By: Express is hidden');

// 2. CORS: our front end is allowed, anyone else gets no Allow-Origin header (browser blocks the read)
r = await fetch(`${url}/auth/login`, { method: 'POST', headers: { origin: 'https://app.example.com' } });
assert.equal(r.headers.get('access-control-allow-origin'), 'https://app.example.com');
assert.equal(r.headers.get('access-control-allow-credentials'), 'true');
r = await fetch(`${url}/auth/login`, { method: 'POST', headers: { origin: 'https://evil.example' } });
assert.equal(r.headers.get('access-control-allow-origin'), null);
console.log('CORS          : app.example.com allowed, evil.example not');

// 3. zod validation
r = await fetch(`${url}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'not-an-email', password: 'x' }) });
const v = await r.json();
console.log('validation    :', r.status, v.errors);
assert.equal(r.status, 422);
assert.ok(v.errors.email && v.errors.password);

// 4. Rate limit: 10 per window (4 used above), so 6 more pass and the rest get 429
const statuses = [];
for (let i = 0; i < 10; i++) {
  r = await fetch(`${url}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'a@b.co', password: 'guess-number-' + i }) });
  statuses.push(r.status);
}
console.log('brute force   :', statuses.join(' '), '| RateLimit:', r.headers.get('ratelimit'));
assert.deepEqual(statuses, [401, 401, 401, 401, 401, 401, 429, 429, 429, 429]);
await close();

// 5. Injection: string-built SQL vs parameterized query
const db = new PGlite();
await db.exec(`CREATE TABLE users (id int, email text, is_admin bool);
  INSERT INTO users VALUES (1,'ann@x.com',true),(2,'bob@x.com',false);`);
const input = "nobody@x.com' OR '1'='1";
const unsafe = await db.query(`SELECT email FROM users WHERE email = '${input}'`);
const safe = await db.query('SELECT email FROM users WHERE email = $1', [input]);
console.log('injection     : string-built returned', unsafe.rows.length, 'rows; parameterized returned', safe.rows.length);
assert.equal(unsafe.rows.length, 2, 'the attacker read every row');
assert.equal(safe.rows.length, 0, 'the input was treated as data, not SQL');
await db.close();

console.log('OK: headers, CORS, validation, rate limiting and parameterized SQL all verified');
