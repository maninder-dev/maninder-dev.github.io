// Topic 112: Modules: CommonJS vs ES Modules  (Full-Stack Handbook, Part 6)
// Run: npm run ex 112        (or: node 112-modules-cjs-vs-esm.js)
// What it shows: this package is ESM ("type": "module"); it imports a .cjs module, loads it with
// require via createRequire, shows require caching, dynamic import(), live bindings and top-level await.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import cjs from './lib/math.cjs';                 // ESM can import CommonJS (module.exports = default)
import main, { add } from './lib/math.mjs';       // named + default ESM exports

console.log('typeof require in ESM:', typeof require, '| import.meta.url ends with', import.meta.url.split('/').pop());
assert.equal(typeof require, 'undefined', 'no require/module/__dirname in ESM');
assert.equal(typeof import.meta.dirname, 'string', 'use import.meta.dirname instead of __dirname');

assert.equal(cjs.add(2, 3), 5);
assert.equal(cjs.kind, 'commonjs');
assert.equal(add(2, 3), 5);
assert.equal(main(), 'main');

// require() still exists when you ask for it, and it caches: the module body runs once
const requireCjs = createRequire(import.meta.url);
const again = requireCjs('./lib/math.cjs');
assert.equal(again, cjs, 'same cached exports object');
assert.equal(globalThis.__mathLoads, 1, 'module body executed only once');
console.log('require cache: module body ran', globalThis.__mathLoads, 'time(s)');

// Dynamic import(): loads asynchronously, returns a namespace object (works in CJS too)
const ns = await import('./lib/math.mjs');      // top-level await: ESM only
assert.equal(ns.add, add);
assert.deepEqual(Object.keys(ns).sort(), ['add', 'default']);

// Static imports are hoisted and analysed before any code runs, which is what enables
// tree-shaking. require() is a plain function call evaluated at runtime, so this works in CJS:
const which = Math.random() < 2 ? './lib/math.cjs' : 'never';
assert.equal(requireCjs(which).add(1, 1), 2);
console.log('dynamic require path resolved at runtime; static import paths must be string literals');
console.log('OK');
