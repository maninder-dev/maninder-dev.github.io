// Topic 89: Covering Indexes  (Full-Stack Handbook, Part 5)
// Run: npm run ex 89       (or: node 089-covering-index.js)
// What it shows: the handbook's MongoDB covered query in PostgreSQL terms. With (email) INCLUDE
// (name, age) the query is an Index Only Scan with "Heap Fetches: 0" (the SQL twin of
// totalDocsExamined: 0). Asking for one more column (like Mongo's _id) breaks the cover.
import assert from 'node:assert/strict';
import { createDb, explain, heading, show } from './lib/db.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT NOT NULL, name TEXT, age INT, bio TEXT);
  INSERT INTO users (email, name, age, bio)
    SELECT 'user' || g || '@example.com', 'User ' || g, 18 + g % 60, repeat('bio ', 50) FROM generate_series(1, 100000) g;
  CREATE INDEX idx_email ON users (email);
`);
await db.query('VACUUM ANALYZE users');
const sql = (cols) => `SELECT ${cols} FROM users WHERE email = 'user4242@example.com'`;
const q = sql('email, name, age');

heading('Plain index on email: index lookup + heap fetch for name and age');
const plain = await explain(db, q, 'ANALYZE, TIMING OFF, COSTS OFF');
show('plan', plain);
assert.doesNotMatch(plain, /Index Only Scan/);

heading('Covering index: (email) INCLUDE (name, age)');
await db.exec('DROP INDEX idx_email; CREATE INDEX idx_email_cover ON users (email) INCLUDE (name, age);');
await db.query('VACUUM ANALYZE users'); // sets the visibility map so the heap can be skipped
const cover = await explain(db, q, 'ANALYZE, TIMING OFF, COSTS OFF');
show('plan', cover);
assert.match(cover, /Index Only Scan using idx_email_cover/);
assert.match(cover, /Heap Fetches: 0/);

heading('Ask for a column not in the index (like _id in MongoDB) and the cover is gone');
const broken = await explain(db, sql('id, email, name, age'), 'ANALYZE, TIMING OFF, COSTS OFF');
show('plan', broken);
assert.doesNotMatch(broken, /Index Only Scan/);

heading('Freshly changed rows need a heap visit until VACUUM');
await db.query(`UPDATE users SET age = age + 1 WHERE email = 'user4242@example.com'`);
const dirty = await explain(db, q, 'ANALYZE, TIMING OFF, COSTS OFF');
show('plan after an UPDATE', dirty);
assert.doesNotMatch(dirty, /Heap Fetches: 0\b/);

await db.close();
console.log('\nOK');
