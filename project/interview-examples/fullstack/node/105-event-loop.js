// Topic 105: The Event Loop  (Full-Stack Handbook, Part 6)
// Run: npm run ex 105        (or: node 105-event-loop.js)
// What it shows: inside an I/O callback setImmediate (check phase) always beats setTimeout 0
// (next timers phase), and the microtask queues are drained after every single callback.
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Repeat 20 times to show the order inside an I/O callback is deterministic, not luck.
for (let i = 0; i < 20; i++) {
  const seen = await new Promise((resolve) => {
    const local = [];
    fs.readFile(import.meta.filename, () => {                            // poll phase
      setTimeout(() => { local.push('timeout'); resolve(local); }, 0);   // timers, next iteration
      setImmediate(() => local.push('immediate'));                       // check, this iteration
    });
  });
  assert.deepEqual(seen, ['immediate', 'timeout']);
}
console.log('20/20 runs inside a readFile callback: immediate, then timeout');

// Microtasks run after EACH macrotask callback, not once per phase.
const order = [];
const log = (s) => { order.push(s); console.log(s); };
await new Promise((resolve) => {
  setTimeout(() => {
    log('timeout A');
    process.nextTick(() => log('  nextTick queued by A'));
    Promise.resolve().then(() => log('  promise queued by A'));
  }, 0);
  setTimeout(() => { log('timeout B'); resolve(); }, 0);
});
assert.deepEqual(order, ['timeout A', '  nextTick queued by A', '  promise queued by A', 'timeout B']);
console.log('OK');
