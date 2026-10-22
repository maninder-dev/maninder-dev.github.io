// Topic 75: What is an ODM?  (Full-Stack Handbook, Part 4)
// Run: npm run ex 75        (or: node 075-what-is-an-odm.js)
// What it shows: a Mongoose schema doing trim/lowercase/enum/default/timestamps/validation, and a
// pre('save') hook hashing the password only when it changed. Uses node:crypto scrypt instead of
// bcrypt so there is no native dependency; the hook logic is identical.
import assert from 'node:assert/strict';
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { withMongoose, section } from './lib/db.js';

const scryptAsync = promisify(scrypt);
const hash = async (pw) => {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await scryptAsync(pw, salt, 32)).toString('hex')}`;
};
const verify = async (pw, stored) => {
  const [salt, h] = stored.split(':');
  return timingSafeEqual(Buffer.from(h, 'hex'), await scryptAsync(pw, salt, 32));
};

await withMongoose({}, async ({ mongoose, db }) => {
  const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    password: String,
  }, { timestamps: true });

  let hashes = 0;
  userSchema.pre('save', async function () {
    if (this.isModified('password')) {
      hashes++;
      this.password = await hash(this.password);
    }
  });
  userSchema.methods.checkPassword = function (pw) { return verify(pw, this.password); };

  const User = mongoose.model('User', userSchema);
  await User.init(); // builds the unique index on email

  section('Create: casting, defaults, timestamps');
  const alice = await User.create({ name: '  Alice  ', email: 'ALICE@x.com', password: 's3cret' });
  const raw = await db.collection('users').findOne({ _id: alice._id }); // what is really stored
  console.log(raw);
  assert.equal(raw.name, 'Alice');
  assert.equal(raw.email, 'alice@x.com'); // stored lowercase
  assert.equal(raw.role, 'user');
  assert.ok(raw.createdAt instanceof Date && raw.updatedAt instanceof Date);
  assert.notEqual(raw.password, 's3cret');
  assert.equal(await alice.checkPassword('s3cret'), true);

  section('pre-save hook re-hashes only when password changed');
  alice.name = 'Alice B';
  await alice.save();
  assert.equal(hashes, 1);
  alice.password = 'n3w';
  await alice.save();
  assert.equal(hashes, 2);
  assert.equal(await alice.checkPassword('n3w'), true);
  console.log('hash ran', hashes, 'times for 3 saves');

  section('Validation happens in the app before any query');
  const bad = new User({ email: 'b@x.com', role: 'superuser' });
  const err = await bad.validate().catch((e) => e);
  console.log(Object.fromEntries(Object.entries(err.errors).map(([k, e]) => [k, e.kind])));
  assert.deepEqual(Object.keys(err.errors).sort(), ['name', 'role']);
  await assert.rejects(() => bad.save(), mongoose.Error.ValidationError);

  section('unique is an index (enforced by MongoDB), not a validator');
  await assert.rejects(() => User.create({ name: 'Dup', email: 'alice@X.com' }), (e) => e.code === 11000);
  console.log('duplicate email -> E11000 from the server');
  assert.equal(await User.countDocuments(), 1);
});
console.log('\nOK');
