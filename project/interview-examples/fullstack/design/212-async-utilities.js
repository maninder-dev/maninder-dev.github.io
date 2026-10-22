// Topic 212: JavaScript Core: Async and Common Utilities  (Full-Stack Handbook, Part 11)
// Run: npm run ex 212        (or: node 212-async-utilities.js)
// What it shows: Promise.all / allSettled / race / any outcomes, a timeout via race, debounce and
// throttle (driven by Node's mock timers so the counts are exact), and a hand-written Promise.all.
import assert from 'node:assert/strict';
import { mock } from 'node:test';

const ok = (v, ms) => new Promise((r) => setTimeout(() => r(v), ms));
const fail = (e, ms) => new Promise((_, j) => setTimeout(() => j(e), ms));

await assert.rejects(Promise.all([ok('a', 10), fail('x', 5)]), (e) => e === 'x');
const settled = await Promise.allSettled([ok('a', 10), fail('x', 5)]);
assert.deepEqual(settled, [{ status: 'fulfilled', value: 'a' }, { status: 'rejected', reason: 'x' }]);
await assert.rejects(Promise.race([ok('a', 10), fail('x', 5)]), (e) => e === 'x');
assert.equal(await Promise.any([ok('a', 10), fail('x', 5)]), 'a');
await assert.rejects(Promise.any([fail('x', 1), fail('y', 2)]), AggregateError);
console.log("combinators   : all->rejects 'x', allSettled->both, race->'x' (first to settle), any->'a'");

// Timeout with race (and AbortSignal.timeout, the modern built-in)
const slowFetch = ok('data', 200);
await assert.rejects(Promise.race([slowFetch, fail(new Error('Timed out'), 20)]), /Timed out/);
console.log('timeout       : race with a 20 ms timer rejects "Timed out"');

// --- debounce and throttle ---
function debounce(fn, wait = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}
function throttle(fn, interval = 200) {
  let last = -Infinity;
  return (...args) => {
    const now = Date.now();
    if (now - last >= interval) { last = now; fn(...args); }
  };
}

mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
// The user types "react" one key every 50 ms, then stops.
const searches = [];
const search = debounce((q) => searches.push(q), 300);
let q = '';
for (const ch of 'react') { q += ch; search(q); mock.timers.tick(50); }
assert.deepEqual(searches, [], 'nothing yet: still typing');
mock.timers.tick(300);
assert.deepEqual(searches, ['react'], 'one search, with the final value');
console.log('debounce      : 5 keystrokes ->', searches.length, 'search for', JSON.stringify(searches[0]));

// Scroll events every 16 ms for 1 second (clock reset to 0 so the times read easily)
mock.timers.setTime(0);
const saves = [];
const onScroll = throttle(() => saves.push(Date.now()), 200);
for (let t = 0; t < 1000; t += 16) { onScroll(); mock.timers.tick(16); }
assert.equal(saves.length, 5, 'at most once per 200 ms');
assert.ok(saves.every((t, i) => i === 0 || t - saves[i - 1] >= 200));
console.log('throttle      : 63 scroll events ->', saves.length, 'saves at', saves.join(', '), 'ms');
mock.timers.reset();

// --- Promise.all by hand ---
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    const results = [];
    let done = 0;
    if (promises.length === 0) return resolve(results);
    promises.forEach((p, i) => Promise.resolve(p).then((v) => {
      results[i] = v;                                   // by index, not push: order is kept
      if (++done === promises.length) resolve(results);
    }, reject));
  });
}
const fetchNumber = () => ok(3, 5);
assert.deepEqual(await promiseAll([1, Promise.resolve(2), fetchNumber()]), [1, 2, 3]);
assert.deepEqual(await promiseAll([ok('slow', 20), ok('fast', 1)]), ['slow', 'fast'], 'order of input, not of finishing');
assert.deepEqual(await promiseAll([]), []);
await assert.rejects(promiseAll([ok(1, 20), fail(new Error('boom'), 5)]), /boom/);
console.log('promiseAll    : [1, Promise(2), fetch->3] ->', await promiseAll([1, Promise.resolve(2), fetchNumber()]));
console.log('OK: combinators, debounce, throttle and promiseAll verified');
