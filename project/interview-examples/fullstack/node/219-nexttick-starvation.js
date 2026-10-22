// Topic 219: Node.js Questions - nextTick vs setImmediate  (Full-Stack Handbook, Part 11)
// Run: npm run ex 219        (or: node 219-nexttick-starvation.js)
// What it shows: the printed order nextTick, promise, immediate (inside a callback; at ESM top
// level promises run before nextTick, see topic 106), and how recursive nextTick starves timers
// and I/O while recursive setImmediate does not. The recursion is bounded so the demo ends.
import assert from 'node:assert/strict';

const order = await new Promise((resolve) => {
  setTimeout(() => {
    const o = [];
    setImmediate(() => { o.push('immediate'); resolve(o); });
    Promise.resolve().then(() => o.push('promise'));
    process.nextTick(() => o.push('nextTick'));
  }, 0);
});
console.log('order:', order.join(', '));
assert.deepEqual(order, ['nextTick', 'promise', 'immediate']);

// Starvation: a timer is due after 1 ms, but 200k recursive nextTicks all run first.
async function measure(schedule) {
  let calls = 0, callsWhenTimerFired = -1;
  const done = new Promise((resolve) => {
    setTimeout(() => { callsWhenTimerFired = calls; }, 1);
    const loop = () => { if (++calls < 200_000) schedule(loop); else setTimeout(resolve, 5); };
    // Busy for 2 ms first so the 1 ms timer is definitely due before the loop starts
    const until = performance.now() + 2; while (performance.now() < until);
    loop();
  });
  await done;
  return callsWhenTimerFired;
}

const tick = await measure(process.nextTick);
const imm = await measure(setImmediate);
console.log(`recursive nextTick   : timer fired after ${tick} of 200000 calls (starved until the end)`);
console.log(`recursive setImmediate: timer fired after ${imm} of 200000 calls (got a turn right away)`);
assert.equal(tick, 200_000, 'nextTick queue must drain completely before the loop moves on');
assert.ok(imm < 10, 'setImmediate yields to the timers phase every iteration');
// function loop() { process.nextTick(loop); }  // unbounded: blocks all I/O forever - never do this
console.log('OK');
