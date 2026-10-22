// Topic 215: Authentication vs authorization (401 vs 403)  (Full-Stack Handbook, Part 11)
// Run: npm run ex 215        (or: node 215-authn-authz.js)
// What it shows: the handbook's DELETE /api/posts/:id - `authenticate` answers "who are you?" (401 when
// there is no valid token) and the ownership/role check answers "may you do this?" (403 when not).
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import { listen } from './lib.js';

const SECRET = 'demo-only-secret-do-not-use';
const posts = new Map([[1, { id: 1, authorId: 7, title: 'Mine' }], [2, { id: 2, authorId: 8, title: 'Someone else' }], [3, { id: 3, authorId: 8, title: 'Spam' }]]);

function authenticate(req, res, next) {                     // authentication: who are you?
  const token = req.get('authorization')?.replace(/^Bearer /, '');
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { res.status(401).set('WWW-Authenticate', 'Bearer').json({ error: 'Log in to continue' }); }
}

const app = express();
app.delete('/api/posts/:id', authenticate, (req, res) => {
  const post = posts.get(Number(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const isOwner = post.authorId === req.user.sub;           // authorization: may you do this?
  const isModerator = req.user.role === 'moderator';
  if (!isOwner && !isModerator) return res.status(403).json({ error: 'You can only delete your own posts' });
  posts.delete(post.id);
  res.sendStatus(204);
});
const { url, close } = await listen(app);

const tokenFor = (claims) => jwt.sign(claims, SECRET, { expiresIn: '15m' });
const del = (id, token) => fetch(`${url}/api/posts/${id}`, { method: 'DELETE', headers: token ? { authorization: `Bearer ${token}` } : {} });
const ann = tokenFor({ sub: 7 });

const cases = [
  ['no token', 2, null, 401],
  ['garbage token', 2, 'not.a.jwt', 401],
  ['token signed with another key', 2, jwt.sign({ sub: 7 }, 'other-key'), 401],
  ["Ann deletes Bob's post", 2, ann, 403],
  ['Ann deletes her own post', 1, ann, 204],
  ['moderator deletes spam', 3, tokenFor({ sub: 99, role: 'moderator' }), 204],
  ['Ann deletes a missing post', 42, ann, 404],
];
for (const [label, id, token, expected] of cases) {
  const r = await del(id, token);
  console.log(`${label.padEnd(30)} -> ${r.status}`);
  assert.equal(r.status, expected, label);
}
assert.deepEqual([...posts.keys()], [2], "only Bob's post is left");

await close();
console.log('OK: 401 = not authenticated, 403 = authenticated but not allowed');
