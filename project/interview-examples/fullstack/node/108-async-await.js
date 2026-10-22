// Topic 108: How async/await Works Internally  (Full-Stack Handbook, Part 6)
// Run: npm run ex 108        (or: node 108-async-await.js)
// What it shows: async functions return Promises, await resumes as a microtask, sequential awaits
// cost the sum of the delays while Promise.all costs the max, and allSettled never rejects.
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';

async function getUser(id) { await sleep(10); return { id }; }
function getUserPromise(id) { return sleep(10).then(() => ({ id })); } // roughly equivalent
assert.ok(getUser(1) instanceof Promise, 'an async function always returns a Promise');
assert.deepEqual(await getUser(1), await getUserPromise(1));

// await pauses the function; the caller carries on, the rest resumes as a microtask
const order = [];
async function f() { order.push('f start'); await null; order.push('f resumed'); }
f(); order.push('after f()');
await null;
console.log('order:', order.join(' -> '));
assert.deepEqual(order, ['f start', 'after f()', 'f resumed']);

const getA = () => sleep(200).then(() => 'a');
const getB = () => sleep(200).then(() => 'b');

let t = performance.now();
const a = await getA();   // 200 ms
const b = await getB();   // 200 ms more
const seq = performance.now() - t;

t = performance.now();
const [a2, b2] = await Promise.all([getA(), getB()]); // both at once
const par = performance.now() - t;
console.log(`sequential awaits: ${seq.toFixed(0)} ms, Promise.all: ${par.toFixed(0)} ms`);
assert.deepEqual([a, b, a2, b2], ['a', 'b', 'a', 'b']);
assert.ok(seq >= 390 && par < 320);

// Error handling
const risky = async () => { throw new Error('boom'); };
let caught;
try { await risky(); } catch (err) { caught = err.message; }
assert.equal(caught, 'boom');

const results = await Promise.allSettled([Promise.resolve(1), risky()]);
console.log('allSettled:', results.map((r) => r.status).join(', '));
assert.deepEqual(results.map((r) => r.status), ['fulfilled', 'rejected']);
console.log('OK');
