// Topic 34: Connection Pooling (PgBouncer)  (Full-Stack Handbook, Part 2)
// Run: npm run ex 34       (or: node 034-connection-pooling.js)
// What it shows (simulation): a fake server where opening a connection costs 30 ms (TCP + TLS + auth
// + forking a backend) and each query 2 ms. 100 requests: connect-per-request vs a pool of 5.
// The pool also caps server connections, the way max / default_pool_size do.
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { heading, show } from './lib/db.js';

const CONNECT_MS = 30, QUERY_MS = 2;
const server = { open: 0, peak: 0, opened: 0 };
async function connect() {
  await sleep(CONNECT_MS);
  server.open++; server.opened++; server.peak = Math.max(server.peak, server.open);
  return {
    query: async () => { await sleep(QUERY_MS); return { rows: [{ id: 1 }] }; },
    end: async () => { server.open--; },
  };
}

class Pool {
  constructor({ max }) { this.max = max; this.idle = []; this.size = 0; this.waiters = []; }
  async acquire() {
    if (this.idle.length) return this.idle.pop();
    if (this.size < this.max) { this.size++; return connect(); }
    return new Promise((resolve) => this.waiters.push(resolve)); // queue, like PgBouncer
  }
  release(conn) { const w = this.waiters.shift(); if (w) w(conn); else this.idle.push(conn); }
  async query(sql) { const c = await this.acquire(); try { return await c.query(sql); } finally { this.release(c); } }
  async end() { for (const c of this.idle) await c.end(); }
}

async function burst(handler, n = 100) {
  const t = performance.now();
  await Promise.all(Array.from({ length: n }, handler));
  return performance.now() - t;
}

heading('Connect per request');
const noPoolMs = await burst(async () => { const c = await connect(); await c.query('SELECT 1'); await c.end(); });
const noPool = { ...server };
show('elapsed ms', noPoolMs.toFixed(0));
show('connections opened / peak open on the server', `${noPool.opened} / ${noPool.peak}`);

heading('Pool with max: 5');
Object.assign(server, { open: 0, peak: 0, opened: 0 });
const pool = new Pool({ max: 5 });
const poolMs = await burst(() => pool.query('SELECT * FROM users WHERE id = $1'));
show('elapsed ms', poolMs.toFixed(0));
show('connections opened / peak open on the server', `${server.opened} / ${server.peak}`);
await pool.end();

assert.equal(noPool.opened, 100);
assert.equal(server.opened, 5, 'five connections served all 100 requests');
assert.ok(server.peak <= 5 && noPool.peak > 50, 'the pool protects the database from a connection storm');
console.log('\nPostgreSQL forks one OS process per connection, so 2,000 clients -> PgBouncer (transaction');
console.log('mode, default_pool_size = 40) -> 40 real backends. Watch out: session state (SET, prepared');
console.log('statements, advisory locks) does not survive between transactions in transaction mode.');
console.log('\nOK');
