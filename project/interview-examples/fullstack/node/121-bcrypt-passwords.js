// Topic 121: Password Security with bcrypt  (Full-Stack Handbook, Part 6)
// Run: npm run ex 121        (or: node 121-bcrypt-passwords.js)
// What it shows: random salt per hash, cost factor doubling the work per step, compare at login,
// and the same 401 message for unknown email and wrong password. Uses bcryptjs (pure JS, same
// hash format as the native bcrypt package, no compiler needed on Windows).
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import express from 'express';
import { serve } from './lib/serve.js';

// Why not SHA-256? Same input, same output: one rainbow table cracks every user with that password.
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
assert.equal(sha('hunter2'), sha('hunter2'));

// bcrypt: a new random salt each time, embedded in the hash string
const h1 = await bcrypt.hash('hunter2', 10);
const h2 = await bcrypt.hash('hunter2', 10);
console.log('hash 1:', h1);
console.log('hash 2:', h2, '(same password, different salt)');
assert.notEqual(h1, h2);
assert.match(h1, /^\$2[aby]\$10\$/, '$2b$ + cost + 22-char salt + 31-char hash');
assert.ok(await bcrypt.compare('hunter2', h1));
assert.ok(!(await bcrypt.compare('hunter3', h1)));

// Cost factor: each +1 doubles the work
const time = async (cost) => { const t = performance.now(); await bcrypt.hash('pw', cost); return performance.now() - t; };
await time(4); // warm up
const t8 = await time(8), t10 = await time(10);
console.log(`cost 8: ${t8.toFixed(0)} ms, cost 10: ${t10.toFixed(0)} ms (x${(t10 / t8).toFixed(1)}, expected ~x4)`);
assert.ok(t10 / t8 > 2, 'two extra cost steps = clearly more work');

// Register + login
const users = new Map();
const app = express();
app.use(express.json());
app.post('/register', async (req, res) => {
  const passwordHash = await bcrypt.hash(req.body.password, 10); // handbook uses 12 (~250 ms native)
  users.set(req.body.email, { email: req.body.email, passwordHash });
  res.status(201).json({ email: req.body.email });
});
app.post('/login', async (req, res) => {
  const user = users.get(req.body.email);
  const ok = user && (await bcrypt.compare(req.body.password, user.passwordHash));
  if (!ok) return res.status(401).json({ error: 'Email or password is incorrect' }); // same message both ways
  res.json({ ok: true });
});

const { url, close } = await serve(app);
const post = async (path, body) => {
  const r = await fetch(url + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return [r.status, await r.json()];
};
assert.equal((await post('/register', { email: 'a@x.io', password: 'correct horse' }))[0], 201);
assert.ok(!JSON.stringify([...users.values()]).includes('correct horse'), 'plain password never stored');
assert.deepEqual(await post('/login', { email: 'a@x.io', password: 'correct horse' }), [200, { ok: true }]);
const wrongPw = await post('/login', { email: 'a@x.io', password: 'nope' });
const noUser = await post('/login', { email: 'ghost@x.io', password: 'nope' });
console.log('wrong password ->', wrongPw, '| unknown email ->', noUser);
assert.deepEqual(wrongPw, noUser, "response doesn't reveal which emails exist");
await close();
console.log('OK');
