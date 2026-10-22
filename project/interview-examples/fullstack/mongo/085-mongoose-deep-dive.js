// Topic 85: Mongoose Deep Dive: Populate, Virtuals, Middleware  (Full-Stack Handbook, Part 4)
// Run: npm run ex 85        (or: node 085-mongoose-deep-dive.js)
// What it shows: populate() with a field selection, a virtual (computed, not stored), a virtual
// populate, query middleware hiding soft-deleted docs from every find, statics and instance methods,
// and optimistic concurrency (a stale save is rejected with VersionError).
import assert from 'node:assert/strict';
import { withMongoose, section } from './lib/db.js';

await withMongoose({}, async ({ mongoose, db }) => {
  const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    role: { type: String, default: 'user' },
    deletedAt: { type: Date, default: null },
  }, { toJSON: { virtuals: true }, optimisticConcurrency: true });

  userSchema.virtual('fullName').get(function () { return `${this.firstName} ${this.lastName}`; });
  userSchema.virtual('posts', { ref: 'Post', localField: '_id', foreignField: 'author' }); // virtual populate
  userSchema.pre(/^find/, function () {
    if (!this.getOptions().withDeleted) this.where({ deletedAt: null });
  });
  userSchema.statics.findByEmail = function (e) { return this.findOne({ email: e }); };
  userSchema.methods.isAdmin = function () { return this.role === 'admin'; };
  const User = mongoose.model('User', userSchema);

  const postSchema = new mongoose.Schema({ title: String, author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } });
  const Post = mongoose.model('Post', postSchema);

  const [alice, bob] = await User.create([
    { firstName: 'Alice', lastName: 'Kaur', email: 'alice@x.io', role: 'admin' },
    { firstName: 'Bob', lastName: 'Singh', email: 'bob@x.io' },
  ]);
  await Post.create([{ title: 'Hello', author: alice._id }, { title: 'Again', author: alice._id }, { title: 'Hi', author: bob._id }]);

  section('populate(): replace the ObjectId with the referenced doc (a second query)');
  const posts = await Post.find().populate('author', 'firstName email').sort({ title: 1 });
  console.log(posts.map((p) => `${p.title} by ${p.author.firstName} <${p.author.email}>`));
  assert.equal(posts[0].author.firstName, 'Alice');
  assert.equal(posts[0].author.lastName, undefined); // not selected

  section('Virtuals: computed on read, never stored');
  assert.equal(alice.fullName, 'Alice Kaur');
  const stored = await db.collection('users').findOne({ _id: alice._id });
  assert.equal(stored.fullName, undefined);
  console.log('fullName =', alice.fullName, '| in MongoDB:', stored.fullName);
  const withPosts = await User.findById(alice._id).populate('posts');
  assert.deepEqual(withPosts.posts.map((p) => p.title).sort(), ['Again', 'Hello']);
  console.log('virtual populate user.posts ->', withPosts.posts.map((p) => p.title));

  section('Statics and methods');
  const found = await User.findByEmail('alice@x.io');
  assert.equal(found.isAdmin(), true);
  assert.equal(bob.isAdmin(), false);
  console.log('User.findByEmail(...).isAdmin() ->', found.isAdmin());

  section('Query middleware: soft delete hidden from every find*');
  await User.updateOne({ _id: bob._id }, { deletedAt: new Date() });
  assert.equal((await User.find()).length, 1);
  assert.equal(await User.findById(bob._id), null);
  assert.equal(await User.findByEmail('bob@x.io'), null);
  assert.equal((await User.find().setOptions({ withDeleted: true })).length, 2);
  console.log('find() sees 1 user; with { withDeleted: true } sees 2');

  section('Optimistic concurrency: stale write rejected');
  const tabA = await User.findById(alice._id);
  const tabB = await User.findById(alice._id);
  tabA.lastName = 'Gill';
  await tabA.save(); // __v 0 -> 1
  tabB.lastName = 'Sandhu';
  await assert.rejects(() => tabB.save(), mongoose.Error.VersionError);
  console.log('second editor got VersionError; stored lastName:', (await User.findById(alice._id)).lastName);
  assert.equal((await User.findById(alice._id)).lastName, 'Gill');
});
console.log('\nOK');
