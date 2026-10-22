// Topic 107: process.nextTick vs setImmediate vs setTimeout  (Full-Stack Handbook, Part 6)
// Run: npm run ex 107        (or: node 107-nexttick-setimmediate-settimeout.js)
// What it shows: nextTick always first; inside I/O immediate beats timeout; nextTick lets an
// emitter fire after the constructor returns; setImmediate chunks long work so timers/I/O interleave.
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';

// 1. Inside an I/O callback the order is fully deterministic
const out = await new Promise((resolve) => {
  const o = [];
  fs.stat(import.meta.filename, () => {
    setTimeout(() => { o.push('setTimeout'); resolve(o); }, 0);
    setImmediate(() => o.push('setImmediate'));
    process.nextTick(() => o.push('nextTick'));
  });
});
console.log('inside I/O:', out.join(', '));
assert.deepEqual(out, ['nextTick', 'setImmediate', 'setTimeout']);

// 2. Emitting inside a constructor: nobody is listening yet. nextTick defers the emit.
class BadConn extends EventEmitter { constructor() { super(); this.emit('ready'); } }
class GoodConn extends EventEmitter { constructor() { super(); process.nextTick(() => this.emit('ready')); } }
let badReady = false, goodReady = false;
new BadConn().on('ready', () => (badReady = true));
new GoodConn().on('ready', () => (goodReady = true));
await new Promise((r) => setImmediate(r));
console.log('emit in constructor -> listener called?', badReady, '| deferred with nextTick ->', goodReady);
assert.equal(badReady, false);
assert.equal(goodReady, true);

// 3. Chunking long work with setImmediate lets a timer run between chunks
const events = [];
setTimeout(() => events.push('timer'), 1);
await new Promise((resolve) => {
  let chunk = 0;
  (function work() {
    const until = performance.now() + 5;
    while (performance.now() < until); // 5 ms slice of CPU work
    events.push(`chunk ${++chunk}`);
    if (chunk < 5) setImmediate(work); else resolve();
  })();
});
console.log(events.join(' | '));
const at = events.indexOf('timer');
assert.ok(at > 0 && at < events.length - 1, 'the timer got a turn between chunks');
console.log('OK');
