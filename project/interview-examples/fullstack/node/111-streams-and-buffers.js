// Topic 111: Streams and Buffers  (Full-Stack Handbook, Part 6)
// Run: npm run ex 111        (or: node 111-streams-and-buffers.js)
// What it shows: gzip a 20 MB file with pipeline (constant memory), a Transform stream, streaming a
// file to an HTTP client, pipeline rejecting and cleaning up on error, and Buffer basics.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { Readable, Transform, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import zlib from 'node:zlib';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'streams-'));
const src = path.join(dir, 'huge.log');
const gz = src + '.gz';

// Generate a 20 MB log file without ever holding it in memory
const LINES = 250_000;
await pipeline(
  Readable.from((function* () { for (let i = 0; i < LINES; i++) yield `${i} GET /api/item/${i % 97} 200 ${'x'.repeat(50)}\n`; })()),
  fs.createWriteStream(src),
);
const size = fs.statSync(src).size;

// Compress it: pipeline handles backpressure and closes every stream when done.
// A pass-through spy records chunk sizes: the file flows through in 64 KB pieces.
let chunks = 0, biggest = 0;
const spy = new Transform({ transform(c, _e, cb) { chunks++; biggest = Math.max(biggest, c.length); cb(null, c); } });
await pipeline(fs.createReadStream(src), spy, zlib.createGzip(), fs.createWriteStream(gz));
console.log(`gzip ${(size / 1e6).toFixed(1)} MB -> ${(fs.statSync(gz).size / 1e6).toFixed(2)} MB in ${chunks} chunks, largest ${biggest / 1024} KB`);
assert.equal(biggest, 64 * 1024, 'never more than one 64 KB read buffer at a time');
assert.equal(chunks, Math.ceil(size / (64 * 1024)));

// Round trip with a Transform that counts lines on the way through
let lines = 0;
const counter = new Transform({
  transform(chunk, _enc, cb) { for (const b of chunk) if (b === 10) lines++; cb(null, chunk); },
});
const hash = crypto.createHash('sha256');
await pipeline(fs.createReadStream(gz), zlib.createGunzip(), counter, hash);
const original = crypto.createHash('sha256').update(fs.readFileSync(src)).digest('hex');
assert.equal(hash.digest('hex'), original, 'gunzipped bytes match the original');
assert.equal(lines, LINES);
console.log(`gunzip round trip OK, ${lines} lines counted by the Transform`);

// Stream a file to an HTTP client (like the /video route)
const server = http.createServer((req, res) => fs.createReadStream(src).pipe(res));
await new Promise((r) => server.listen(0, r));
const body = await (await fetch(`http://127.0.0.1:${server.address().port}/video`)).arrayBuffer();
assert.equal(body.byteLength, size);
server.close();
console.log(`HTTP client received ${body.byteLength} bytes`);

// Errors: pipeline rejects and destroys the other streams (no leaked file handles)
const out = fs.createWriteStream(path.join(dir, 'broken.txt'));
const failing = new Transform({ transform(_c, _e, cb) { cb(new Error('bad chunk')); } });
await assert.rejects(pipeline(fs.createReadStream(src), failing, out), /bad chunk/);
assert.equal(out.destroyed, true);
console.log('pipeline rejected on error and destroyed the writer');

// Backpressure in one line: write() returns false once the buffer is full
const slow = new Writable({ highWaterMark: 16, write(_c, _e, cb) { setTimeout(cb, 1); } });
assert.equal(slow.write(Buffer.alloc(32)), false, 'caller should wait for drain');
slow.destroy();

// Buffers: raw bytes
const buf = Buffer.from('héllo', 'utf8');
console.log('Buffer', buf, 'length', buf.length, 'hex', buf.toString('hex'), 'base64', buf.toString('base64'));
assert.equal(buf.length, 6, 'é takes two bytes in UTF-8');
assert.equal(Buffer.from(buf.toString('base64'), 'base64').toString(), 'héllo');

fs.rmSync(dir, { recursive: true, force: true });
console.log('OK');
