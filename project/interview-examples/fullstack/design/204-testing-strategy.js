// Topic 204: Testing Strategy  (Full-Stack Handbook, Part 10)
// Run: npm run ex 204        (or: node 204-testing-strategy.js)
// What it shows: the bottom two layers of the pyramid with Node's built-in test runner (instead of
// Jest + Supertest): pure unit tests, an integration test through a real Express app and a real
// in-process PostgreSQL (PGlite), and a mocked external mailer. E2E (Playwright) is not run here.
import { test, mock, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { PGlite } from '@electric-sql/pglite';
import { listen } from './lib.js';

// ---------- code under test ----------
export const applyDiscount = (amount) => (amount > 1000 ? amount * 0.9 : amount);

function buildApp({ db, mailer }) {          // dependencies injected, so tests can swap them
  const app = express();
  app.use(express.json());
  app.post('/api/users', async (req, res) => {
    const { name, email } = req.body;
    if (!name || !email?.includes('@')) return res.status(422).json({ error: 'name and valid email required' });
    try {
      const { rows } = await db.query('INSERT INTO users(name, email) VALUES ($1, $2) RETURNING id, name, email', [name, email]);
      await mailer.send({ to: email, template: 'welcome' });
      res.status(201).json(rows[0]);
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'Email already registered' });
      throw e;
    }
  });
  return app;
}

// ---------- unit tests: many, fast, no I/O ----------
test('applies 10% discount above Rs. 1000', () => {
  assert.equal(applyDiscount(1500), 1350);
  assert.equal(applyDiscount(800), 800);
});
test('boundary: exactly 1000 gets no discount', () => assert.equal(applyDiscount(1000), 1000));

// ---------- integration tests: real HTTP + real SQL, external service mocked ----------
const db = new PGlite();
await db.exec('CREATE TABLE users (id serial PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL)');
const mailer = { send: mock.fn(async () => true) };
const server = await listen(buildApp({ db, mailer }));
after(async () => { await server.close(); await db.close(); });

const post = (body) => fetch(`${server.url}/api/users`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('POST /api/users creates a user and sends a welcome mail', async () => {
  const res = await post({ name: 'Alice', email: 'alice@test.com' });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.name, 'Alice');
  const { rows } = await db.query('SELECT count(*)::int AS n FROM users');
  assert.equal(rows[0].n, 1);
  assert.equal(mailer.send.mock.callCount(), 1);
  assert.deepEqual(mailer.send.mock.calls[0].arguments[0], { to: 'alice@test.com', template: 'welcome' });
});

test('duplicate email -> 409 from the real UNIQUE constraint, no second mail', async () => {
  const res = await post({ name: 'Alice 2', email: 'alice@test.com' });
  assert.equal(res.status, 409);
  assert.equal(mailer.send.mock.callCount(), 1);
});

test('invalid input -> 422 and nothing written', async () => {
  const res = await post({ name: 'Bob', email: 'nope' });
  assert.equal(res.status, 422);
  const { rows } = await db.query('SELECT count(*)::int AS n FROM users');
  assert.equal(rows[0].n, 1);
});

// A failing test sets a non-zero exit code, so `npm test` catches it.
