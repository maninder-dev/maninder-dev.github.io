// Topic 124: Compression and Streaming Responses  (Full-Stack Handbook, Part 6)
// Run: npm run ex 124        (or: node 124-compression-streaming.js)
// What it shows: compression() gzips a large JSON response (and skips tiny ones under the
// threshold), and a CSV export streamed row by row from an async iterator acting as a DB cursor.
import assert from 'node:assert/strict';
import http from 'node:http';
import zlib from 'node:zlib';
import compression from 'compression';
import express from 'express';
import { serve } from './lib/serve.js';

const app = express();
app.use(compression({ threshold: 1024 })); // skip tiny responses

const products = Array.from({ length: 2000 }, (_, i) => ({ id: i, name: `Product ${i}`, price: 999, tags: ['office', 'desk'] }));
app.get('/api/products', (req, res) => res.json(products));
app.get('/api/tiny', (req, res) => res.json({ ok: true }));

// Stand-in for client.query(new QueryStream(...)): yields rows one at a time
async function* orderCursor(n) {
  for (let id = 1; id <= n; id++) {
    if (id % 1000 === 0) await new Promise((r) => setImmediate(r)); // rows arrive over time
    yield { id, total: id * 3, created_at: '2026-01-01' };
  }
}
app.get('/export/orders.csv', async (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.write('id,total,created_at\n');
  for await (const row of orderCursor(5000)) res.write(`${row.id},${row.total},${row.created_at}\n`);
  res.end();
});

const { url, close } = await serve(app);

// Use http.get (not fetch) so we can see the raw compressed bytes on the wire
const raw = (path) => new Promise((resolve, reject) => {
  http.get(url + path, { headers: { 'Accept-Encoding': 'gzip' } }, (res) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => resolve({ headers: res.headers, body: Buffer.concat(chunks), chunks: chunks.length }));
  }).on('error', reject);
});

const big = await raw('/api/products');
const plain = zlib.gunzipSync(big.body);
console.log(`/api/products: ${plain.length} bytes JSON -> ${big.body.length} bytes gzip (${(100 - (big.body.length / plain.length) * 100).toFixed(0)}% smaller)`);
assert.equal(big.headers['content-encoding'], 'gzip');
assert.deepEqual(JSON.parse(plain), products);
assert.ok(big.body.length < plain.length * 0.3);

const tiny = await raw('/api/tiny');
console.log('/api/tiny: content-encoding =', tiny.headers['content-encoding'] ?? '(none, under threshold)');
assert.equal(tiny.headers['content-encoding'], undefined);

const csv = await raw('/export/orders.csv');
const text = zlib.gunzipSync(csv.body).toString();
const lines = text.trim().split('\n');
console.log(`/export/orders.csv: ${lines.length - 1} rows, chunked=${csv.headers['transfer-encoding'] === 'chunked'}, arrived in ${csv.chunks} network chunks`);
assert.equal(lines[0], 'id,total,created_at');
assert.equal(lines.length, 5001);
assert.equal(lines.at(-1), '5000,15000,2026-01-01');
assert.equal(csv.headers['transfer-encoding'], 'chunked', 'no Content-Length: streamed, never built in memory');

await close();
console.log('OK');
