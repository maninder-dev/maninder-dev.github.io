// Topic 40: Triggers - Use Cases  (Full-Stack Handbook, Part 2)
// Run: npm run ex 40       (or: node 040-triggers.js)
// What it shows: the three good uses from the handbook - an updated_at timestamp (BEFORE UPDATE),
// an audit log (AFTER UPDATE/DELETE with OLD and NEW), and a denormalized post counter kept in sync.
import assert from 'node:assert/strict';
import { createDb, all, one, heading, show } from './lib/db.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT NOT NULL, post_count INT NOT NULL DEFAULT 0,
                      updated_at TIMESTAMPTZ NOT NULL DEFAULT '2020-01-01');
  CREATE TABLE posts (id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id), title TEXT);
  CREATE TABLE audit_log (id SERIAL PRIMARY KEY, table_name TEXT, op TEXT, old_row JSONB, new_row JSONB);
  INSERT INTO users (email) VALUES ('ann@x.com'), ('bob@x.com');

  CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
  BEGIN
    NEW.updated_at := now();
    RETURN NEW;
  END $$ LANGUAGE plpgsql;
  CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

  CREATE FUNCTION audit() RETURNS trigger AS $$
  BEGIN
    INSERT INTO audit_log (table_name, op, old_row, new_row) VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NULL;
  END $$ LANGUAGE plpgsql;
  CREATE TRIGGER trg_users_audit AFTER UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION audit();

  CREATE FUNCTION bump_post_count() RETURNS trigger AS $$
  BEGIN
    IF TG_OP = 'INSERT' THEN UPDATE users SET post_count = post_count + 1 WHERE id = NEW.user_id;
    ELSE UPDATE users SET post_count = post_count - 1 WHERE id = OLD.user_id; END IF;
    RETURN NULL;
  END $$ LANGUAGE plpgsql;
  CREATE TRIGGER trg_posts_count AFTER INSERT OR DELETE ON posts FOR EACH ROW EXECUTE FUNCTION bump_post_count();
`);

heading('updated_at is set automatically');
await db.query(`UPDATE users SET email = 'ann@new.com' WHERE id = 1`);
const ann = await one(db, `SELECT email, updated_at > now() - interval '1 minute' AS fresh FROM users WHERE id = 1`);
show('ann', ann);
assert.equal(ann.fresh, true);

heading('Audit log captures old and new values');
const log = await all(db, `SELECT op, old_row->>'email' AS old_email, new_row->>'email' AS new_email FROM audit_log ORDER BY id`);
show('audit_log', log);
assert.deepEqual(log[0], { op: 'UPDATE', old_email: 'ann@x.com', new_email: 'ann@new.com' });

heading('Denormalized counter stays in sync');
await db.exec(`INSERT INTO posts (user_id, title) SELECT 2, 'post ' || g FROM generate_series(1, 5) g;
               DELETE FROM posts WHERE id = 1;`);
const bob = await one(db, `SELECT post_count, (SELECT count(*)::int FROM posts WHERE user_id = 2) AS actual FROM users WHERE id = 2`);
show('bob post_count vs actual', bob);
assert.equal(bob.post_count, bob.actual);
assert.equal(bob.post_count, 4);
const audits = (await one(db, 'SELECT count(*)::int AS n FROM audit_log')).n;
show('audit rows (counter updates were audited too - triggers chain, a hidden cost)', audits);
assert.equal(audits, 1 + 6);

await db.close();
console.log('\nOK');
