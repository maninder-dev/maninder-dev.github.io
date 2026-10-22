// Topic 87: B-Tree Index Internals  (Full-Stack Handbook, Part 5)
// Run: npm run ex 87       (or: node 087-btree-internals.js)
// What it shows: on 1,000,000 rows the real index lookup touches ~4 pages (root -> internal ->
// leaf -> heap), matching the fan-out math; a range query finds the first key then walks the
// linked leaves; and a tiny B+Tree model prints how keys route through the levels.
import assert from 'node:assert/strict';
import { createDb, one, explain, heading, show } from './lib/db.js';

const db = await createDb();
await db.exec(`CREATE TABLE users (id INT, email TEXT);
               INSERT INTO users SELECT g, 'user' || lpad(g::text, 7, '0') || '@x.com' FROM generate_series(1, 1000000) g;
               CREATE INDEX idx_email ON users(email);`);
await db.query('VACUUM ANALYZE users');

heading('Fan-out: how many keys fit on one 8 KB index page?');
const st = await one(db, `SELECT c.relpages AS pages, c.reltuples::bigint AS keys FROM pg_class c WHERE relname = 'idx_email'`);
const perLeaf = Math.round(Number(st.keys) / st.pages);
const levels = Math.ceil(Math.log(Number(st.keys)) / Math.log(perLeaf));
show('index pages / keys / ~keys per page', `${st.pages} / ${st.keys} / ${perLeaf}`);
show('expected tree height  ceil(log_fanout(n))', levels);
show('a billion rows would need', Math.ceil(Math.log(1e9) / Math.log(perLeaf)) + ' levels');

heading('Point lookup: buffers touched');
const point = await explain(db, `SELECT * FROM users WHERE email = 'user0777777@x.com'`, 'ANALYZE, BUFFERS, TIMING OFF, COSTS OFF');
show('plan', point);
const pages = [...point.match(/Buffers: shared (.*)/)[1].matchAll(/=(\d+)/g)].reduce((s, m) => s + +m[1], 0);
show('pages read = index levels + 1 heap page', pages);
assert.ok(pages <= levels + 2, 'a few pages instead of a full scan');

heading('Range lookup: find the first key, then walk the leaf chain');
const range = await explain(db, `SELECT email FROM users WHERE email BETWEEN 'user0500000@x.com' AND 'user0500999@x.com'`, 'ANALYZE, BUFFERS, TIMING OFF, COSTS OFF');
show('plan', range);
assert.match(range, /Index Only Scan|Index Scan|Bitmap/);

heading('Toy B+Tree routing (fan-out 3) for the handbook diagram');
const leaves = [['a', 'b', 'c'], ['d', 'e', 'g'], ['h', 'i', 'l'], ['m', 'n', 'r'], ['s', 't', 'v'], ['w', 'x', 'z']];
const internal = [{ keys: ['d', 'h'], children: [0, 1, 2] }, { keys: ['s', 'w'], children: [3, 4, 5] }];
const root = { keys: ['m'], children: [0, 1] };
function find(key) {
  const path = ['root'];
  const node = internal[root.keys.filter((k) => key >= k).length];
  path.push(`internal[${node.keys}]`);
  const leaf = node.children[node.keys.filter((k) => key >= k).length];
  path.push(`leaf[${leaves[leaf]}]`);
  return { path, found: leaves[leaf].includes(key), leaf };
}
const f = find('e');
show('find "e"', `${f.path.join(' -> ')} = ${f.path.length} page reads`);
assert.ok(f.found);
const start = find('e').leaf, end = find('k').leaf;
const walked = leaves.slice(start, end + 1).flat().filter((k) => k >= 'e' && k <= 'k');
show('range e..k via linked leaves', walked);
assert.deepEqual(walked, ['e', 'g', 'h', 'i']);

await db.close();
console.log('\nOK');
