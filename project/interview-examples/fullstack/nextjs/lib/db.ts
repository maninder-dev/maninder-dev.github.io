// Tiny in-memory "database" shared by every topic (Full-Stack Handbook, Part 9).
// Every call sleeps a little so streaming, Suspense and caching are visible, and counts itself
// so pages can show how many real queries ran (request memoization, topic 184).
// State lives on globalThis because route handlers and pages are separate bundles in one process.

export type Product = { id: number; name: string; price: number };
export type Post = { slug: string; title: string; body: string };
export type Review = { id: number; productId: number; text: string };
export type User = { id: string; username: string; password: string; name: string; role: 'admin' | 'user'; plan: string };
export type Todo = { id: number; title: string; ownerId: string };
export type Order = { id: number; userId: string; total: number; date: string };

type State = {
  products: Product[]; posts: Post[]; reviews: Review[]; users: User[]; todos: Todo[]; orders: Order[];
  calls: Record<string, number>; nextId: number;
};

function seed(): State {
  return {
    products: [
      { id: 1, name: 'Keyboard', price: 2500 },
      { id: 2, name: 'Mouse', price: 900 },
      { id: 3, name: 'Monitor', price: 15000 },
      { id: 4, name: 'USB-C Hub', price: 1800 },
    ],
    posts: [
      { slug: 'hello-world', title: 'Hello World', body: 'The first post.' },
      { slug: 'nextjs-caching', title: 'Next.js Caching', body: 'Four layers of cache.' },
    ],
    reviews: [
      { id: 1, productId: 1, text: 'Great clicky keys' },
      { id: 2, productId: 1, text: 'A bit loud' },
    ],
    // Demo users only. Real apps store password hashes (bcrypt/argon2), never plain text.
    users: [
      { id: 'u1', username: 'alice', password: 'alice123', name: 'Alice', role: 'admin', plan: 'Pro' },
      { id: 'u2', username: 'bob', password: 'bob123', name: 'Bob', role: 'user', plan: 'Free' },
    ],
    todos: [{ id: 1, title: 'Read the handbook', ownerId: 'u1' }],
    orders: Array.from({ length: 5 }, (_, i) => ({
      id: 100 + i, userId: i % 2 ? 'u2' : 'u1', total: 500 * (i + 1), date: `2026-0${i + 1}-15`,
    })),
    calls: {},
    nextId: 1000,
  };
}

const g = globalThis as unknown as { __handbookDb?: State };
const state: State = (g.__handbookDb ??= seed());

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const copy = <T,>(v: T): T => structuredClone(v);

async function track(name: string, ms: number) {
  state.calls[name] = (state.calls[name] ?? 0) + 1;
  await sleep(ms);
}

export const db = {
  callCount: (name: string) => state.calls[name] ?? 0,

  product: {
    async findMany(q = '') {
      await track('product.findMany', 50);
      return copy(state.products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())));
    },
    async findUnique(id: number) {
      await track('product.findUnique', 50);
      return copy(state.products.find((p) => p.id === id) ?? null);
    },
    async create(data: { name: string; price: number }) {
      await track('product.create', 20);
      const p = { id: state.nextId++, ...data };
      state.products.push(p);
      return copy(p);
    },
    async update(id: number, data: Partial<Omit<Product, 'id'>>) {
      await track('product.update', 20);
      const p = state.products.find((x) => x.id === id);
      if (!p) return null;
      Object.assign(p, data);
      return copy(p);
    },
    async delete(id: number) {
      await track('product.delete', 20);
      const i = state.products.findIndex((p) => p.id === id);
      if (i === -1) return false;
      state.products.splice(i, 1);
      return true;
    },
  },

  post: {
    async findMany() { await track('post.findMany', 50); return copy(state.posts); },
    async findBySlug(slug: string) {
      await track('post.findBySlug', 50);
      return copy(state.posts.find((p) => p.slug === slug) ?? null);
    },
  },

  review: {
    // Deliberately slow so the Suspense boundary in topic 176 is visible.
    async findByProduct(productId: number, ms = 1200) {
      await track('review.findByProduct', ms);
      return copy(state.reviews.filter((r) => r.productId === productId));
    },
  },

  user: {
    async findById(id: string, ms = 100) {
      await track('user.findById', ms);
      return copy(state.users.find((u) => u.id === id) ?? null);
    },
    async findByUsername(username: string) {
      await track('user.findByUsername', 20);
      return copy(state.users.find((u) => u.username === username) ?? null);
    },
  },

  todo: {
    async findMany() { await track('todo.findMany', 30); return copy(state.todos); },
    async findUnique(id: number) {
      await track('todo.findUnique', 20);
      return copy(state.todos.find((t) => t.id === id) ?? null);
    },
    async create(data: { title: string; ownerId: string }) {
      await track('todo.create', 20);
      const t = { id: state.nextId++, ...data };
      state.todos.push(t);
      return copy(t);
    },
    async delete(id: number) {
      await track('todo.delete', 20);
      state.todos = state.todos.filter((t) => t.id !== id);
    },
  },

  order: {
    // Two orders per page; returns null for a page past the end (topic 180 -> notFound).
    async findByUser(userId: string, page: number, ms = 300) {
      await track('order.findByUser', ms);
      const mine = state.orders.filter((o) => o.userId === userId);
      const pages = Math.max(1, Math.ceil(mine.length / 2));
      if (!Number.isInteger(page) || page < 1 || page > pages) return null;
      return copy(mine.slice((page - 1) * 2, page * 2));
    },
  },
};
