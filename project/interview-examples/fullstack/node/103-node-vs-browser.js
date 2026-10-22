// Topic 103: Node.js vs Browser JavaScript  (Full-Stack Handbook, Part 6)
// Run: npm run ex 103        (or: node 103-node-vs-browser.js)
// What it shows: Node has process, fs and full OS access but no window/document; both share globalThis.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Globals: no DOM in Node, but globalThis and process exist
console.log('typeof window   :', typeof window);
console.log('typeof document :', typeof document);
console.log('typeof process  :', typeof process);
assert.equal(typeof window, 'undefined');
assert.equal(typeof document, 'undefined');
assert.equal(globalThis.process, process);

// Web APIs that Node also implements
assert.equal(typeof fetch, 'function');
assert.equal(typeof URL, 'function');
assert.equal(typeof structuredClone, 'function');

console.log('NODE_ENV:', process.env.NODE_ENV ?? '(unset)', '| pid:', process.pid,
  '| heapUsed MB:', (process.memoryUsage().heapUsed / 1e6).toFixed(1));
assert.ok(process.pid > 0);

// File system access: impossible from a web page (top-level await works in ESM)
const file = path.join(os.tmpdir(), `notes-${process.pid}.txt`);
await fs.writeFile(file, 'written from Node');
const text = await fs.readFile(file, 'utf8');
console.log('read back:', text);
assert.equal(text, 'written from Node');
await fs.rm(file);

console.log('platform:', process.platform, '| cpus:', os.cpus().length);
console.log('OK');
