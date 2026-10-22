// Topic 102: What is Node.js?  (Full-Stack Handbook, Part 6)
// Run: npm run ex 102        (or: node 102-what-is-node.js)
// What it shows: a complete JSON HTTP server using only the built-in http module, no framework.
import http from 'node:http';
import assert from 'node:assert/strict';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Hello from Node', path: req.url }));
});

await new Promise((resolve) => server.listen(0, resolve)); // port 0 = any free port
const { port } = server.address();
console.log(`Listening on http://localhost:${port}`);

const res = await fetch(`http://localhost:${port}/hello?x=1`);
const body = await res.json();
console.log('status:', res.status, 'content-type:', res.headers.get('content-type'));
console.log('body:', body);

assert.equal(res.status, 200);
assert.equal(res.headers.get('content-type'), 'application/json');
assert.deepEqual(body, { message: 'Hello from Node', path: '/hello?x=1' });

console.log('V8', process.versions.v8, '| libuv', process.versions.uv, '| node', process.version);
server.closeAllConnections();
server.close();
console.log('OK');
