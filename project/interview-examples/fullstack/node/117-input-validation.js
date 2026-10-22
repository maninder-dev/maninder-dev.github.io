// Topic 117: Input Validation  (Full-Stack Handbook, Part 6)
// Run: npm run ex 117        (or: node 117-input-validation.js)
// What it shows: a reusable zod validation middleware that returns 400 with field errors, and
// replaces req.body with the parsed data (unknown keys such as "isAdmin" are stripped).
import assert from 'node:assert/strict';
import express from 'express';
import { z } from 'zod';
import { serve } from './lib/serve.js';

const createUser = z.object({
  name: z.string().min(2).max(50),
  email: z.email(),
  age: z.number().int().min(13).optional(),
});

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: z.flattenError(result.error) });
  req.body = result.data; // typed and stripped of unknown keys
  next();
};

const app = express();
app.use(express.json());
app.post('/api/users', validate(createUser), (req, res) => res.status(201).json({ saved: req.body }));

const { url, close } = await serve(app);
const post = async (body) => {
  const r = await fetch(url + '/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await r.json();
  console.log(JSON.stringify(body), '->', r.status, JSON.stringify(json));
  return [r.status, json];
};

let [status, body] = await post({ name: 'Ada', email: 'ada@example.com', age: 36, isAdmin: true });
assert.equal(status, 201);
assert.deepEqual(body.saved, { name: 'Ada', email: 'ada@example.com', age: 36 }, 'isAdmin was stripped');

[status, body] = await post({ name: 'A', email: 'not-an-email', age: 12.5 });
assert.equal(status, 400);
assert.deepEqual(Object.keys(body.errors.fieldErrors).sort(), ['age', 'email', 'name']);

[status, body] = await post({ name: 'Bob', email: 'bob@example.com', age: '30' });
assert.equal(status, 400, 'a string is not a number: no silent coercion');
assert.ok(body.errors.fieldErrors.age);

await close();
console.log('OK');
