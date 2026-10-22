// Topic 7: Primary Key vs Foreign Key  (Full-Stack Handbook, Part 1)
// Run: npm run ex 7        (or: node 007-primary-foreign-keys.js)
// What it shows: the PK rejects duplicates and NULLs; the FK rejects orphans; ON DELETE CASCADE
// removes a user's posts with the user. Also: PostgreSQL does NOT index FK columns for you.
import assert from 'node:assert/strict';
import { createDb, all, heading, show, expectPgError } from './lib/db.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE users (id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL);
  CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT
  );
  INSERT INTO users (email) VALUES ('ann@x.com'), ('bob@x.com');
  INSERT INTO posts (user_id, title) VALUES (1, 'Hello'), (1, 'Second post'), (2, 'Bob here');
`);

heading('Primary key: unique and NOT NULL');
show('duplicate id', (await expectPgError(() => db.query(`INSERT INTO users (id, email) VALUES (1, 'x@x.com')`), '23505')).message);
show('NULL id', (await expectPgError(() => db.query(`INSERT INTO users (id, email) VALUES (NULL, 'y@x.com')`), '23502')).message);

heading('Foreign key: referential integrity');
const fk = await expectPgError(() => db.query(`INSERT INTO posts (user_id, title) VALUES (999, 'orphan')`), '23503');
show('post for user 999', fk.message);

heading('ON DELETE CASCADE');
await db.query('DELETE FROM users WHERE id = 1');
const left = await all(db, 'SELECT user_id, title FROM posts ORDER BY id');
show('posts left', left);
assert.deepEqual(left, [{ user_id: 2, title: 'Bob here' }]);

heading('Which columns are indexed? (PK and UNIQUE yes, the FK column no)');
const idx = await all(db, `SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY 1`);
idx.forEach((r) => console.log('   ', r.indexdef));
assert.ok(!idx.some((r) => /\(user_id\)/.test(r.indexdef)), 'no automatic FK index');
console.log('Tip: CREATE INDEX ON posts(user_id) - joins and cascading deletes need it.');

await db.close();
console.log('\nOK');
