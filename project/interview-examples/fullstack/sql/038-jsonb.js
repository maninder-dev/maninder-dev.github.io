// Topic 38: JSONB Indexing and Queries  (Full-Stack Handbook, Part 2)
// Run: npm run ex 38       (or: node 038-jsonb.js)
// What it shows: every JSONB operator from the handbook (->, ->>, @>, ?, jsonb_set) on 40,000
// products, and the two indexes: GIN (jsonb_path_ops) for containment, an expression B-Tree for
// one hot key. Plans before and after prove they're used.
import assert from 'node:assert/strict';
import { createDb, all, one, explain, heading, show } from './lib/db.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE products (id SERIAL PRIMARY KEY, data JSONB NOT NULL);
  INSERT INTO products(data) VALUES ('{"name":"MacBook","specs":{"ram":16},"tags":["laptop","apple"]}');
  INSERT INTO products(data)
    SELECT jsonb_build_object('name', 'Item ' || g, 'specs', jsonb_build_object('ram', 4 * (1 + g % 8)),
                              'tags', jsonb_build_array((ARRAY['laptop','phone','tv','audio'])[1 + g % 4]))
           || CASE WHEN g % 10 = 0 THEN '{"discount": 10}'::jsonb ELSE '{}'::jsonb END
    FROM generate_series(1, 40000) g;
  ANALYZE products;
`);

heading('Operators');
const ram = await all(db, `SELECT data->>'name' AS name FROM products WHERE (data->'specs'->>'ram')::int >= 32 LIMIT 3`);
show(`->  ->> with a cast: ram >= 32`, ram);
const apple = await all(db, `SELECT data->>'name' AS name FROM products WHERE data @> '{"tags":["apple"]}'`);
show(`@> containment: tags contains "apple"`, apple);
assert.deepEqual(apple, [{ name: 'MacBook' }]);
const disc = await one(db, `SELECT count(*)::int AS n FROM products WHERE data ? 'discount'`);
show(`? key exists: has "discount"`, disc.n);
assert.equal(disc.n, 4000);

heading('jsonb_set: update one nested value in place');
await db.query(`UPDATE products SET data = jsonb_set(data, '{specs,ram}', '32') WHERE id = 1`);
const mac = await one(db, `SELECT data->'specs' AS specs FROM products WHERE id = 1`);
show('MacBook specs', mac.specs);
assert.deepEqual(mac.specs, { ram: 32 });

heading('GIN index for containment');
const containment = `SELECT id FROM products WHERE data @> '{"tags":["apple"]}'`;
show('before', await explain(db, containment));
await db.exec('CREATE INDEX idx_data_gin ON products USING GIN (data jsonb_path_ops); ANALYZE products;');
const ginPlan = await explain(db, containment);
show('after', ginPlan);
assert.match(ginPlan, /idx_data_gin/);

heading('Expression B-Tree for one hot key');
const byName = `SELECT id FROM products WHERE data->>'name' = 'Item 777'`;
show('before', await explain(db, byName));
await db.exec(`CREATE INDEX idx_name ON products ((data->>'name')); ANALYZE products;`);
const exprPlan = await explain(db, byName);
show('after', exprPlan);
assert.match(exprPlan, /idx_name/);
console.log('Note: jsonb_path_ops supports @> only (smaller, faster); the default jsonb_ops also supports ? ?| ?&.');

await db.close();
console.log('\nOK');
