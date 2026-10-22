// Drizzle schema shared by the SQL ORM examples (topics 74-84, 86, 218), plus DDL and seed data.
import { pgTable, serial, text, integer, timestamp, numeric } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull().default('x'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
});

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  balance: integer('balance').notNull(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  status: text('status').notNull(),
  total: numeric('total', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({ posts: many(posts) }));
export const postsRelations = relations(posts, ({ one }) => ({ author: one(users, { fields: [posts.userId], references: [users.id] }) }));

export const schema = { users, posts, accounts, orders, usersRelations, postsRelations };

// In a real project drizzle-kit generates this DDL from the schema above (see 079).
// PGlite's exec() runs several statements at once (the extended protocol used for queries does not).
export async function createTables(client) {
  await client.exec(`
    CREATE TABLE users (id serial PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
      password_hash text NOT NULL DEFAULT 'x', created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE posts (id serial PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id), title text NOT NULL);
    CREATE INDEX posts_user_id_idx ON posts(user_id);
    CREATE TABLE accounts (id serial PRIMARY KEY, user_id integer REFERENCES users(id), balance integer NOT NULL);
    CREATE TABLE orders (id serial PRIMARY KEY, user_id integer NOT NULL, status text NOT NULL,
      total numeric NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
  `);
}

/** n users with 3 posts each. */
export async function seed(db, n = 10) {
  const us = await db.insert(users)
    .values(Array.from({ length: n }, (_, i) => ({ name: `user${i + 1}`, email: `user${i + 1}@example.com` })))
    .returning({ id: users.id });
  await db.insert(posts).values(us.flatMap((u) => [1, 2, 3].map((k) => ({ userId: u.id, title: `post ${k} by ${u.id}` }))));
  return us;
}
