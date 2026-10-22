// Topic 214: HTTP, REST and APIs - status codes, PUT vs PATCH vs POST  (Full-Stack Handbook, Part 11)
// Run: npm run ex 214        (or: node 214-status-put-patch.js)
// What it shows: a small REST API returning the specific status code for each case (201, 204, 401, 403,
// 404, 409, 422, 429) and the difference between PUT (full replace, idempotent), PATCH (partial) and
// POST (creates a new resource every call).
import assert from 'node:assert/strict';
import express from 'express';
import { listen } from './lib.js';

const users = new Map([[7, { id: 7, name: 'Ann', email: 'ann@x.com', city: 'Delhi' }]]);
let nextId = 8;
let hits = 0;

const app = express();
app.use(express.json());
const auth = (req, res, next) => {
  const role = req.get('x-role');
  if (!role) return res.status(401).json({ error: 'Log in to continue' });
  req.role = role; next();
};
app.use(auth);
app.use((req, res, next) => (++hits > 30 ? res.status(429).set('Retry-After', '60').json({ error: 'Too many requests' }) : next()));

const validate = (b, full) => {
  const errors = {};
  if (full && !b.name) errors.name = 'Required';
  if ((full || 'email' in b) && !/^\S+@\S+$/.test(b.email ?? '')) errors.email = 'Must be a valid email';
  return Object.keys(errors).length ? errors : null;
};
app.post('/users', (req, res) => {
  const errors = validate(req.body, true);
  if (errors) return res.status(422).json({ errors });
  if ([...users.values()].some((u) => u.email === req.body.email)) return res.status(409).json({ error: 'Email already registered' });
  const user = { id: nextId++, ...req.body };
  users.set(user.id, user);
  res.status(201).location(`/users/${user.id}`).json(user);
});
app.put('/users/:id', (req, res) => {           // replace: fields you leave out are gone
  const id = Number(req.params.id);
  if (!users.has(id)) return res.status(404).json({ error: 'User not found' });
  const errors = validate(req.body, true);
  if (errors) return res.status(422).json({ errors });
  users.set(id, { id, ...req.body });
  res.json(users.get(id));
});
app.patch('/users/:id', (req, res) => {         // merge: only the sent fields change
  const id = Number(req.params.id);
  if (!users.has(id)) return res.status(404).json({ error: 'User not found' });
  const errors = validate(req.body, false);
  if (errors) return res.status(422).json({ errors });
  users.set(id, { ...users.get(id), ...req.body, id });
  res.json(users.get(id));
});
app.delete('/users/:id', (req, res) => {
  if (req.role !== 'admin') return res.status(403).json({ error: 'Only admins can do this' });
  if (!users.delete(Number(req.params.id))) return res.status(404).json({ error: 'User not found' });
  res.status(204).end();
});
const { url, close } = await listen(app);

const call = async (method, path, body, role = 'user') => {
  const r = await fetch(url + path, { method, headers: { 'content-type': 'application/json', ...(role && { 'x-role': role }) }, body: body && JSON.stringify(body) });
  return { status: r.status, body: r.status === 204 ? null : await r.json(), headers: r.headers };
};

// PATCH: only city changes
let r = await call('PATCH', '/users/7', { city: 'Mohali' });
assert.deepEqual(r.body, { id: 7, name: 'Ann', email: 'ann@x.com', city: 'Mohali' });
console.log('PATCH  /users/7 {city}        ->', r.status, r.body);

// PUT: full replacement; city was not sent, so it is gone. Repeating it changes nothing (idempotent).
r = await call('PUT', '/users/7', { name: 'Ann', email: 'ann@x.com' });
const again = await call('PUT', '/users/7', { name: 'Ann', email: 'ann@x.com' });
assert.deepEqual(r.body, { id: 7, name: 'Ann', email: 'ann@x.com' });
assert.deepEqual(again.body, r.body);
console.log('PUT    /users/7 {name,email}  ->', r.status, r.body, '(city removed; same result twice)');

// POST: not idempotent - each call makes a new resource
const p1 = await call('POST', '/users', { name: 'Bob', email: 'bob@x.com' });
const p2 = await call('POST', '/users', { name: 'Cy', email: 'cy@x.com' });
assert.equal(p1.status, 201);
assert.equal(p1.headers.get('location'), '/users/8');
assert.notEqual(p1.body.id, p2.body.id);
console.log('POST   /users x2              ->', p1.status, p2.status, 'ids', p1.body.id, p2.body.id);

const cases = [
  ['POST', '/users', { name: 'Bob2', email: 'bob@x.com' }, 'user', 409],
  ['POST', '/users', { name: 'Dee', email: 'nope' }, 'user', 422],
  ['GET', '/users/7', undefined, null, 401],
  ['DELETE', '/users/8', undefined, 'user', 403],
  ['DELETE', '/users/999', undefined, 'admin', 404],
  ['DELETE', '/users/8', undefined, 'admin', 204],
];
for (const [m, path, body, role, expected] of cases) {
  r = await call(m, path, body, role);
  console.log(`${m.padEnd(6)} ${path.padEnd(22)} as ${String(role).padEnd(5)} -> ${r.status}`, r.body ?? '');
  assert.equal(r.status, expected);
}
while ((r = await call('PATCH', '/users/7', { city: 'Pune' })).status !== 429);
assert.equal(r.headers.get('retry-after'), '60');
console.log('(31st request)                -> 429 Retry-After:', r.headers.get('retry-after'));

await close();
console.log('OK: every case returned its most specific status code');
