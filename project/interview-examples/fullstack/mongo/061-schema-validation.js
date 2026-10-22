// Topic 61: Schema-less vs Schema-flexible  (Full-Stack Handbook, Part 3)
// Run: npm run ex 61        (or: node 061-schema-validation.js)
// What it shows: with no validator anything goes; a $jsonSchema validator rejects bad documents
// with a detailed reason, "warn" lets them through, and collMod adds rules to an existing collection.
import assert from 'node:assert/strict';
import { Int32 } from 'mongodb';
import { withMongo, section } from './lib/db.js';

const userSchema = {
  bsonType: 'object',
  required: ['email', 'name'],
  properties: {
    email: { bsonType: 'string', pattern: '^.+@.+$' },
    age: { bsonType: 'int', minimum: 0 },
  },
};

await withMongo({}, async ({ db }) => {
  section('Schema-less: no validator, typos go straight in');
  const loose = db.collection('loose_users');
  await loose.insertOne({ emial: 'oops', age: 'forty' });
  assert.equal(await loose.countDocuments(), 1);
  console.log('stored a doc with a misspelt field and a string age');

  section('Schema-flexible: $jsonSchema validator, validationAction "error"');
  await db.createCollection('users', { validator: { $jsonSchema: userSchema }, validationAction: 'error' });
  const users = db.collection('users');

  await users.insertOne({ name: 'Alice', email: 'alice@example.com', age: new Int32(30), extra: 'allowed' });
  console.log('valid doc inserted (extra fields are allowed unless additionalProperties: false)');

  const bad = [
    [{ name: 'NoEmail' }, 'missing required email'],
    [{ name: 'Bob', email: 'not-an-email' }, 'pattern mismatch'],
    [{ name: 'Carl', email: 'c@x.io', age: new Int32(-1) }, 'age below minimum'],
    [{ name: 'Dan', email: 'd@x.io', age: 30.5 }, 'age is a double, not int'],
  ];
  for (const [doc, why] of bad) {
    await assert.rejects(() => users.insertOne(doc), (err) => {
      assert.equal(err.code, 121); // DocumentValidationFailure
      const reason = JSON.stringify(err.errInfo?.details?.schemaRulesNotSatisfied?.[0] ?? {}).slice(0, 80);
      console.log(`rejected (${why}):`, reason);
      return true;
    });
  }
  // Updates are validated too.
  await assert.rejects(() => users.updateOne({ name: 'Alice' }, { $unset: { email: '' } }), { code: 121 });
  assert.equal(await users.countDocuments(), 1);

  section('validationAction "warn": logs on the server but accepts the write');
  await db.command({ collMod: 'users', validationAction: 'warn' });
  await users.insertOne({ name: 'Legacy import' });
  assert.equal(await users.countDocuments(), 2);
  console.log('invalid doc accepted under "warn" (useful while migrating old data)');

  section('Add a validator to an existing collection with collMod');
  await db.command({ collMod: 'loose_users', validator: { $jsonSchema: userSchema }, validationLevel: 'moderate' });
  // moderate: existing invalid docs are left alone, but new inserts must pass.
  await assert.rejects(() => loose.insertOne({ emial: 'again' }), { code: 121 });
  const info = (await db.listCollections({ name: 'loose_users' }).toArray())[0];
  console.log('loose_users options:', Object.keys(info.options));
  assert.equal(info.options.validationLevel, 'moderate');
});
console.log('\nOK');
