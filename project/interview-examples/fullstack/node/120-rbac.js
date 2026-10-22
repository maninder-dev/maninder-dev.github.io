// Topic 120: Role-Based Access Control (RBAC)  (Full-Stack Handbook, Part 6)
// Run: npm run ex 120        (or: node 120-rbac.js)
// What it shows: authenticate (401) then authorize by role permission (403), plus an ownership
// check inside the handler so editors can only change their own posts.
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import { serve } from './lib/serve.js';

const SECRET = 'demo-secret';
const permissions = {
  admin: ['read', 'write', 'delete', 'manage_users'],
  editor: ['read', 'write'],
  viewer: ['read'],
};

function authenticate(req, res, next) {
  try { req.user = jwt.verify((req.headers.authorization || '').slice(7), SECRET); next(); }
  catch { res.status(401).json({ error: 'Login required' }); }
}
const authorize = (perm) => (req, res, next) =>
  permissions[req.user.role]?.includes(perm)
    ? next()
    : res.status(403).json({ error: 'You do not have permission for this action' });

const posts = new Map([[1, { id: 1, authorId: 10, title: 'Mine' }], [2, { id: 2, authorId: 99, title: 'Theirs' }], [3, { id: 3, authorId: 99, title: 'Old' }]]);

const app = express();
app.get('/api/posts', authenticate, authorize('read'), (req, res) => res.json([...posts.values()]));
app.put('/api/posts/:id', authenticate, authorize('write'), (req, res) => {
  const post = posts.get(Number(req.params.id));
  if (!post) return res.status(404).json({ error: 'Not found' });
  if (post.authorId !== req.user.sub && req.user.role !== 'admin') {   // ownership check
    return res.status(403).json({ error: 'You can only edit your own posts' });
  }
  res.json({ ...post, title: 'edited' });
});
app.delete('/api/posts/:id', authenticate, authorize('delete'), (req, res) => {
  posts.delete(Number(req.params.id));
  res.status(204).end();
});

const { url, close } = await serve(app);
const as = (sub, role) => ({ Authorization: `Bearer ${jwt.sign({ sub, role }, SECRET)}` });
const call = async (method, path, headers = {}) => (await fetch(url + path, { method, headers })).status;

const cases = [
  ['GET', '/api/posts', null, 401, 'no token: who are you?'],
  ['GET', '/api/posts', as(1, 'viewer'), 200, 'viewer can read'],
  ['PUT', '/api/posts/1', as(1, 'viewer'), 403, 'viewer cannot write'],
  ['PUT', '/api/posts/1', as(10, 'editor'), 200, 'editor edits own post'],
  ['PUT', '/api/posts/2', as(10, 'editor'), 403, "editor cannot edit someone else's post"],
  ['DELETE', '/api/posts/2', as(10, 'editor'), 403, 'editor lacks delete'],
  ['PUT', '/api/posts/2', as(1, 'admin'), 200, 'admin bypasses ownership'],
  ['DELETE', '/api/posts/3', as(1, 'admin'), 204, 'admin can delete'],
  ['GET', '/api/posts', as(1, 'intern'), 403, 'unknown role gets nothing'],
];
for (const [method, path, headers, expected, why] of cases) {
  const status = await call(method, path, headers ?? {});
  console.log(`${method.padEnd(6)} ${path.padEnd(14)} -> ${status}  ${why}`);
  assert.equal(status, expected, why);
}
assert.equal(posts.has(3), false);
await close();
console.log('OK');
