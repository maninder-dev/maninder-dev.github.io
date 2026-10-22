// Topic 88: Composite Indexes and the Leftmost Prefix Rule  (Full-Stack Handbook, Part 5)
// Run: npm run ex 88       (or: node 088-composite-leftmost-prefix.js)
// What it shows: the handbook's (city, age, status) examples translated to SQL on 100,000 users.
// "Seek" = the index part of the plan touches a handful of pages. Without the leading column the
// planner can still *read* the index, but it must walk all of it (or, with PostgreSQL 18's skip
// scan, descend once per distinct city) - you can see that in the index node's Buffers count.
import assert from 'node:assert/strict';
import { createDb, explain, heading, show } from './lib/db.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE users (id SERIAL PRIMARY KEY, city TEXT, age INT, status TEXT, name TEXT);
  INSERT INTO users (city, age, status, name)
    SELECT 'City' || (g % 200), 18 + g % 60, (ARRAY['active','inactive','banned'])[1 + g % 3], 'User ' || g
    FROM generate_series(1, 100000) g;
  CREATE INDEX idx_city_age_status ON users (city, age, status);
`);
await db.query('VACUUM ANALYZE users');
const indexPages = (await db.query(`SELECT relpages FROM pg_class WHERE relname = 'idx_city_age_status'`)).rows[0].relpages;

const cases = [
  ['city', `city = 'City7'`, ['city']],
  ['city + age', `city = 'City7' AND age = 25`, ['city', 'age']],
  ['city + age + status', `city = 'City7' AND age = 25 AND status = 'inactive'`, ['city', 'age', 'status']],
  ['age only', `age = 25`, null],
  ['status only', `status = 'active'`, null],
  ['city + status (skips age)', `city = 'City7' AND status = 'active'`, ['city']],
];
for (const [label, where, seekCols] of cases) {
  heading(label);
  const plan = await explain(db, `SELECT * FROM users WHERE ${where}`, 'ANALYZE, TIMING OFF, COSTS OFF');
  show('plan', plan.split('\nPlanning')[0]);
  const cond = plan.match(/Index Cond: (.*)/)?.[1] ?? '';
  const lines = plan.split('\n');
  const at = lines.findIndex((l) => l.includes('idx_city_age_status'));
  const bufLine = at < 0 ? '' : lines.slice(at).find((l) => l.includes('Buffers:'));
  const indexPagesRead = [...(bufLine ?? '').matchAll(/=(\d+)/g)].reduce((n, m) => n + +m[1], 0);
  show('index pages read', at < 0 ? 'index not used' : `${indexPagesRead} of ${indexPages}`);
  if (!seekCols) {
    assert.ok(at < 0 || indexPagesRead > indexPages / 2, 'no seek: the whole index had to be walked');
  } else {
    for (const c of seekCols) assert.ok(cond.includes(c), `${c} should be in the Index Cond`);
    assert.ok(indexPagesRead <= 10, 'a seek touches a few pages');
  }
  if (label.startsWith('city + status')) {
    // Seeks on city; status can only be checked per age value inside City7 (PG 18 skips through the
    // ages; older versions filter every City7 entry). Either way it reads more than a full-prefix seek.
    console.log('    city narrows the seek; status is checked inside the City7 range, age by age');
  }
}

heading('Rule of thumb: equality columns first, then range / sort');
await db.exec('CREATE INDEX idx_status_age ON users (status, age); ANALYZE users;');
const good = await explain(db, `SELECT * FROM users WHERE status = 'banned' AND age BETWEEN 30 AND 31`);
show('(status, age) for status = ... AND age BETWEEN ...', good);
assert.match(good, /idx_status_age|idx_city_age_status/);

await db.close();
console.log('\nOK');
