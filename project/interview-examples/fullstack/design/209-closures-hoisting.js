// Topic 209: JavaScript Core: Scope, Closures and Hoisting  (Full-Stack Handbook, Part 11)
// Run: npm run ex 209        (or: node 209-closures-hoisting.js)
// What it shows: closures holding private state, var vs let vs const scoping, hoisting and the
// temporal dead zone, and the classic setTimeout loop (3 3 3 vs 0 1 2) - each asserted.
// Note: this file is an ES module, so it runs in strict mode (as modern code does).
import assert from 'node:assert/strict';

// --- Closures: private state ---
function makeCounter() {
  let count = 0;                 // only the returned function can reach it
  return () => ++count;
}
const next = makeCounter();
next(); next();
assert.equal(next(), 3);
const other = makeCounter();
assert.equal(other(), 1, 'each call to makeCounter gets its own count');
console.log('closure       : counter A at 3, counter B at 1 (separate private state)');

// Closure for memoization
function memoize(fn) {
  const cache = new Map();
  return (n) => (cache.has(n) ? cache.get(n) : (cache.set(n, fn(n)), cache.get(n)));
}
let calls = 0;
const slowSquare = memoize((n) => { calls++; return n * n; });
slowSquare(9); slowSquare(9); slowSquare(9);
assert.equal(calls, 1);
console.log('memoize       : 3 calls, 1 computation');

// --- var vs let vs const ---
if (true) { var a = 1; let b = 2; } // eslint-disable-line no-constant-condition
assert.equal(a, 1, 'var leaks out of the block');
assert.equal(typeof b, 'undefined', 'let stays inside the block');   // typeof is safe on undeclared names
assert.throws(() => eval('b'), ReferenceError);

const user = { name: 'Ann' };
user.name = 'Bob';                                    // mutation is allowed
assert.equal(user.name, 'Bob');
assert.throws(() => { eval('user = {}'); }, TypeError); // reassignment is not
console.log('var/let/const : var leaks, let is block-scoped, const blocks reassignment not mutation');

// --- Hoisting ---
assert.equal(greet(), 'hi');                          // function declarations are hoisted with their body
function greet() { return 'hi'; }

assert.equal(x, undefined);                           // var hoisted without its value
var x = 5;
assert.equal(x, 5);

assert.throws(() => y, ReferenceError, 'temporal dead zone'); // eslint-disable-line no-use-before-define
let y = 5;
assert.equal(y, 5);

assert.throws(() => new Later(), ReferenceError, 'classes are in the TDZ too');
class Later {}
console.log('hoisting      : function ok, var -> undefined, let/class -> ReferenceError (TDZ)');

// --- The classic loop question ---
const withVar = [];
const withLet = [];
for (var i = 0; i < 3; i++) setTimeout(() => withVar.push(i));
for (let j = 0; j < 3; j++) setTimeout(() => withLet.push(j));
await new Promise((r) => setTimeout(r, 10));
console.log('loop var      :', withVar.join(' '), '  loop let:', withLet.join(' '));
assert.deepEqual(withVar, [3, 3, 3], 'one shared i, read after the loop finished');
assert.deepEqual(withLet, [0, 1, 2], 'a fresh j binding per iteration');

// Pre-let fix: capture i with a closure (an IIFE)
const withIife = [];
for (var k = 0; k < 3; k++) ((n) => setTimeout(() => withIife.push(n)))(k);
await new Promise((r) => setTimeout(r, 10));
assert.deepEqual(withIife, [0, 1, 2]);
console.log('OK: closures, scoping and hoisting behave as described');
