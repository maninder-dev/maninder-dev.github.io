// Topic 86: Sequelize vs Prisma vs TypeORM vs Drizzle  (Full-Stack Handbook, Part 4)
// Run: npm run ex 86        (or: node 086-orm-comparison.js)
// What it shows: one task - "users with their posts, newest user first, names only" - run for real
// in Drizzle (PGlite) and Mongoose (mongodb-memory-server), with the Sequelize, Prisma and TypeORM
// versions as comments (not installed, to keep the package small). Both real runs must agree.
import assert from 'node:assert/strict';
import { desc } from 'drizzle-orm';
import { startPg, withMongoose, section } from './lib/db.js';
import { schema, createTables, seed, users } from './lib/pg-schema.js';

console.table([
  { lib: 'Sequelize', style: 'active record, JS-first', types: 'added later', strength: 'mature, many dialects' },
  { lib: 'TypeORM', style: 'decorators, entities', types: 'good', strength: 'familiar to Java/NestJS devs' },
  { lib: 'Prisma', style: 'schema file + generated client', types: 'excellent', strength: 'DX, migrations, type safety' },
  { lib: 'Drizzle', style: 'SQL-like TS builder', types: 'excellent', strength: 'thin, fast, close to SQL' },
  { lib: 'Mongoose', style: 'schema-based ODM', types: 'good', strength: 'the standard for MongoDB' },
]);

/* ---- Schema ----
   // Prisma: schema.prisma
   model User { id Int @id @default(autoincrement())  email String @unique  posts Post[] }
   model Post { id Int @id @default(autoincrement())  authorId Int  author User @relation(fields: [authorId], references: [id]) }

   // Sequelize
   const User = sequelize.define('User', { email: { type: DataTypes.STRING, unique: true } });
   User.hasMany(Post, { foreignKey: 'userId' }); Post.belongsTo(User);

   // TypeORM
   @Entity() class User { @PrimaryGeneratedColumn() id: number; @Column({ unique: true }) email: string;
                          @OneToMany(() => Post, (p) => p.author) posts: Post[]; }

   // Drizzle: see lib/pg-schema.js (pgTable + relations)

   ---- Query ----
   await User.findAll({ attributes: ['name'], include: [{ model: Post, attributes: ['title'] }], order: [['id', 'DESC']] }); // Sequelize
   await prisma.user.findMany({ select: { name: true, posts: { select: { title: true } } }, orderBy: { id: 'desc' } });    // Prisma
   await userRepo.find({ select: { name: true, posts: { title: true } }, relations: { posts: true }, order: { id: 'DESC' } }); // TypeORM
*/

section('Drizzle (runs)');
const pg = await startPg(schema);
await createTables(pg.client);
await seed(pg.db, 3);
const fromDrizzle = await pg.count(() => pg.db.query.users.findMany({
  columns: { name: true },
  with: { posts: { columns: { title: true }, orderBy: (p, { asc }) => asc(p.id) } },
  orderBy: desc(users.id),
}));
console.log(`${fromDrizzle.n} SQL query ->`, JSON.stringify(fromDrizzle.result[0]));
await pg.stop();

section('Mongoose (runs)');
let fromMongoose;
await withMongoose({}, async ({ mongoose }) => {
  const ops = [];
  mongoose.set('debug', (coll, method) => ops.push(`${coll}.${method}`));
  const User = mongoose.model('User', new mongoose.Schema({ n: Number, name: String }));
  const Post = mongoose.model('Post', new mongoose.Schema({ title: String, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }));
  for (let i = 1; i <= 3; i++) {
    const u = await User.create({ n: i, name: `user${i}` });
    await Post.create([1, 2, 3].map((k) => ({ title: `post ${k} by ${i}`, user: u._id })));
  }
  ops.length = 0;
  const us = await User.find({}, 'name').sort({ n: -1 }).lean();
  const ps = await Post.find({ user: { $in: us.map((u) => u._id) } }, 'title user').sort({ _id: 1 }).lean();
  fromMongoose = us.map((u) => ({ name: u.name, posts: ps.filter((p) => p.user.equals(u._id)).map((p) => ({ title: p.title })) }));
  console.log(`${ops.length} MongoDB queries ->`, JSON.stringify(fromMongoose[0]), '(document stores: no JOIN, a second $in query)');
  assert.equal(ops.length, 2);
});

assert.equal(fromDrizzle.n, 1);
assert.deepEqual(fromDrizzle.result, fromMongoose);
console.log('\nDrizzle and Mongoose returned identical results');
console.log('\nOK');
