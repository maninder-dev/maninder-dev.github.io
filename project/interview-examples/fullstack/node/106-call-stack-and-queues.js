// Topic 106: Call Stack, Callback Queue and Microtask Queue  (Full-Stack Handbook, Part 6)
// Run: npm run ex 106        (or: node 106-call-stack-and-queues.js)
// What it shows: sync code first, then nextTick, then promise/queueMicrotask, then macrotasks,
// plus the ES-module gotcha: at the top level of an .mjs/"type":"module" file, promises beat nextTick.
import assert from 'node:assert/strict';

function snippet(log, done) {
  log('1 sync');
  setTimeout(() => { log('5 timeout'); done(); }, 0);
  Promise.resolve().then(() => log('3 promise'));
  process.nextTick(() => log('2 nextTick'));
  queueMicrotask(() => log('4 microtask'));
  log('1b sync');
}

// A) Inside a callback (and at the top level of a CommonJS file): the order from the handbook
const out = [];
await new Promise((done) => setTimeout(() => snippet((s) => out.push(s), done), 0));
console.log('inside a callback :', out.join(', '));
assert.deepEqual(out, ['1 sync', '1b sync', '2 nextTick', '3 promise', '4 microtask', '5 timeout']);

// B) At the top level of an ES module. Module evaluation itself runs as a promise job, so the
// microtask queue keeps draining (promise, microtask) before Node gets to the nextTick queue.
const top = [];
await new Promise((done) => snippet((s) => top.push(s), done));
console.log('ESM top level     :', top.join(', '));
assert.deepEqual(top, ['1 sync', '1b sync', '3 promise', '4 microtask', '2 nextTick', '5 timeout']);

// "All microtasks before the next macrotask": a microtask that queues more microtasks
// finishes the whole chain before the timer gets a turn.
const out2 = [];
setTimeout(() => out2.push('timeout'), 0);
let n = 0;
const chain = () => { out2.push(`micro ${++n}`); if (n < 3) queueMicrotask(chain); };
queueMicrotask(chain);
await new Promise((r) => setTimeout(r, 30)); // registered after the 0 ms timer, so it fires after it
console.log('microtask chain   :', out2.join(', '));
assert.deepEqual(out2, ['micro 1', 'micro 2', 'micro 3', 'timeout']);
console.log('OK');
