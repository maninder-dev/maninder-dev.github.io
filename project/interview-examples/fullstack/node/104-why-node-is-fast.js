// Topic 104: Why Node.js is Fast  (Full-Stack Handbook, Part 6)
// Run: npm run ex 104        (or: node 104-why-node-is-fast.js)
// What it shows: one thread waits on two slow I/O calls at once, so the total is ~1 delay, not 2.
// A local server with a 300 ms delay stands in for https://api.example.com (no internet calls).
import assert from 'node:assert/strict';
import http from 'node:http';

const DELAY = 300;
let inFlight = 0, maxInFlight = 0;
const server = http.createServer((req, res) => {
  inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
  setTimeout(() => { inFlight--; res.end(JSON.stringify({ path: req.url })); }, DELAY);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

let t = performance.now();
await fetch(`${base}/users`).then((r) => r.json());
await fetch(`${base}/orders`).then((r) => r.json());
const sequential = performance.now() - t;

t = performance.now();
const [users, orders] = await Promise.all([
  fetch(`${base}/users`).then((r) => r.json()),
  fetch(`${base}/orders`).then((r) => r.json()),
]);
const concurrent = performance.now() - t;

console.log(`sequential : ${sequential.toFixed(0)} ms`);
console.log(`Promise.all: ${concurrent.toFixed(0)} ms  (requests waiting at once: ${maxInFlight})`);
assert.deepEqual([users.path, orders.path], ['/users', '/orders']);
assert.ok(sequential >= 2 * DELAY - 20, 'sequential pays both delays');
assert.ok(concurrent < 1.6 * DELAY, 'concurrent pays roughly one delay');
assert.equal(maxInFlight, 2, 'the single JS thread had two requests waiting at the same time');

server.closeAllConnections();
server.close();
console.log('OK');
