// Topic 1: What is a Database?  (Full-Stack Handbook, Part 1)
// Run: npm run ex 1        (or: node 001-what-is-a-database.js)
// What it shows: the DBMS gives you structure (schema + constraints), search, and safe writes
// that a loose JSON file does not - the same "books" table from the handbook, in real PostgreSQL.
import assert from 'node:assert/strict';
import { createDb, all, heading, show, expectPgError } from './lib/db.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE books (
    id     SERIAL PRIMARY KEY,
    title  VARCHAR(200) NOT NULL,
    author VARCHAR(100)
  );
  INSERT INTO books (title, author) VALUES
    ('Clean Code', 'Robert Martin'), ('Clean Architecture', 'Robert Martin'),
    ('Designing Data-Intensive Applications', 'Martin Kleppmann');
`);

heading('Search: the DBMS finds rows for you');
const byMartin = await all(db, `SELECT id, title FROM books WHERE author = $1 ORDER BY id`, ['Robert Martin']);
show('books by Robert Martin', byMartin);
assert.deepEqual(byMartin.map((b) => b.title), ['Clean Code', 'Clean Architecture']);

heading('Structure: the schema rejects bad data (a JSON file would accept it)');
const err = await expectPgError(() => db.query(`INSERT INTO books (author) VALUES ('Nobody')`), '23502');
show('missing title ->', err.message);

heading('Safe writes: a failed transaction leaves nothing behind');
await db.query('BEGIN');
await db.query(`INSERT INTO books (title, author) VALUES ('Half-written', 'Anon')`);
await db.query('ROLLBACK');
const count = (await all(db, 'SELECT count(*)::int AS n FROM books'))[0].n;
show('row count after rollback', count);
assert.equal(count, 3);

await db.close();
console.log('\nOK');
