// Topic 214: HTTP, REST and APIs - offset vs cursor pagination  (Full-Stack Handbook, Part 11)
// Run: npm run ex 214        (or: node 214-cursor-pagination.js)
// What it shows: the handbook's cursor endpoint on real PostgreSQL (PGlite). Walking all pages with a
// cursor returns every row exactly once even when new rows are inserted mid-walk, while OFFSET pages
// return duplicates. EXPLAIN shows the cursor query uses the primary-key index.
import assert from 'node:assert/strict';
import express from 'express';
import { PGlite } from '@electric-sql/pglite';
import { listen } from './lib.js';

const db = new PGlite();
await db.exec(`CREATE TABLE posts (id serial PRIMARY KEY, title text);
  INSERT INTO posts (title) SELECT 'post ' || g FROM generate_series(1, 95) g;
  ANALYZE posts;`);

const app = express();
app.get('/posts', async (req, res) => {   // cursor: newest first, ?after=<last id seen>
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const after = Number(req.query.after) || 2 ** 31 - 1;
  const { rows } = await db.query('SELECT id, title FROM posts WHERE id < $1 ORDER BY id DESC LIMIT $2', [after, limit + 1]);
  const hasMore = rows.length > limit;     // fetch one extra row to know if there is a next page
  const data = rows.slice(0, limit);
  res.json({ data, nextCursor: hasMore ? data.at(-1).id : null });
});
app.get('/posts-offset', async (req, res) => {
  const page = Number(req.query.page) || 1;
  const { rows } = await db.query('SELECT id, title FROM posts ORDER BY id DESC LIMIT 20 OFFSET $1', [(page - 1) * 20]);
  res.json({ data: rows });
});
const { url, close } = await listen(app);
const get = async (path) => (await fetch(url + path)).json();
const insertNew = (n) => db.query(`INSERT INTO posts (title) SELECT 'new ' || g FROM generate_series(1, ${n}) g`);

// Walk with a cursor; 5 new posts are published after page 1
const cursorIds = [];
let cursor = null, pages = 0;
do {
  const page = await get(`/posts?limit=20${cursor ? `&after=${cursor}` : ''}`);
  cursorIds.push(...page.data.map((p) => p.id));
  cursor = page.nextCursor;
  if (++pages === 1) await insertNew(5);
} while (cursor);
console.log(`cursor : ${pages} pages, ${cursorIds.length} rows, ${cursorIds.length - new Set(cursorIds).size} duplicates`);
assert.equal(cursorIds.length, 95);
assert.equal(new Set(cursorIds).size, 95, 'every original row once');

// Same walk with OFFSET; 5 new posts are published after page 1 again
const offsetIds = [];
for (let page = 1; page <= 5; page++) {
  offsetIds.push(...(await get(`/posts-offset?page=${page}`)).data.map((p) => p.id));
  if (page === 1) await insertNew(5);
}
const dupes = offsetIds.length - new Set(offsetIds).size;
console.log(`offset : 5 pages, ${offsetIds.length} rows, ${dupes} duplicates (rows shifted down under the reader)`);
assert.equal(dupes, 5);

// Cost: OFFSET reads and throws away rows; the cursor seeks straight into the index
await db.exec("INSERT INTO posts (title) SELECT 'bulk ' || g FROM generate_series(1, 50000) g; ANALYZE posts;");
const plan = async (sql, params) => (await db.query('EXPLAIN ANALYZE ' + sql, params)).rows.map((r) => r['QUERY PLAN']);
const cursorPlan = await plan('SELECT id, title FROM posts WHERE id < $1 ORDER BY id DESC LIMIT 21', [20000]);
const offsetPlan = await plan('SELECT id, title FROM posts ORDER BY id DESC LIMIT 20 OFFSET 40000', []);
const rowsRead = (p) => Number(p.find((l) => /Index Scan|Seq Scan/.test(l)).match(/actual time=\S+ rows=(\d+)/)[1]);
console.log('cursor plan :', cursorPlan.find((l) => l.includes('Scan')).trim());
console.log('offset plan :', offsetPlan.find((l) => l.includes('Scan')).trim());
console.log(`rows read   : cursor ${rowsRead(cursorPlan)} vs offset ${rowsRead(offsetPlan)}`);
assert.ok(cursorPlan.some((l) => l.includes('Index Scan Backward using posts_pkey')));
assert.ok(rowsRead(cursorPlan) <= 21 && rowsRead(offsetPlan) >= 40_020);

await close(); await db.close();
console.log('OK: cursor pagination is stable and index-friendly; offset is neither');
