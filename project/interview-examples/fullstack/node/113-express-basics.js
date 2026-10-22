// Topic 113: What is Express.js?  (Full-Stack Handbook, Part 6)
// Run: npm run ex 113        (or: node 113-express-basics.js)
// What it shows: routing, route params, JSON body parsing and response helpers, called with fetch.
import assert from 'node:assert/strict';
import express from 'express';
import { serve } from './lib/serve.js';

const app = express();
app.use(express.json());

const users = [{ id: 1, name: 'Alice' }];

app.get('/api/users', (req, res) => res.json(users));
app.get('/api/users/:id', (req, res) => {
  const user = users.find((u) => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});
app.post('/api/users', (req, res) => {
  const user = { id: users.length + 1, name: req.body.name };
  users.push(user);
  res.status(201).json(user);
});

const { url, close } = await serve(app);
const call = async (path, init) => {
  const res = await fetch(url + path, init);
  const body = await res.json();
  console.log(init?.method ?? 'GET', path, '->', res.status, JSON.stringify(body));
  return { status: res.status, body };
};

let r = await call('/api/users');
assert.deepEqual(r, { status: 200, body: [{ id: 1, name: 'Alice' }] });

r = await call('/api/users/1');
assert.deepEqual(r.body, { id: 1, name: 'Alice' });

r = await call('/api/users/99');
assert.deepEqual(r, { status: 404, body: { error: 'User not found' } });

r = await call('/api/users', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Bob' }),
});
assert.deepEqual(r, { status: 201, body: { id: 2, name: 'Bob' } });

r = await call('/api/users/2');
assert.equal(r.body.name, 'Bob');

await close();
console.log('OK');
