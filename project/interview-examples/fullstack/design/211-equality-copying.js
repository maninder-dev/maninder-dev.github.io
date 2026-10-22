// Topic 211: JavaScript Core: Equality, Types and Copying  (Full-Stack Handbook, Part 11)
// Run: npm run ex 211        (or: node 211-equality-copying.js)
// What it shows: == vs ===, the x == null idiom, shallow vs deep copy (structuredClone), falsy values and
// the || vs ?? bug, and null vs undefined - each asserted.
import assert from 'node:assert/strict';

/* eslint-disable eqeqeq */
// --- == vs === ---
assert.equal('1' == 1, true);
assert.equal('1' === 1, false);
assert.equal(0 == '', true, 'surprising: both convert to 0');
assert.equal('' == '0', false, '...so == is not even transitive');
assert.equal(null == undefined, true);
assert.equal(null == 0, false, 'null only loosely equals undefined');
assert.equal(NaN === NaN, false);
assert.equal(Object.is(NaN, NaN), true);
assert.equal({} === {}, false, 'objects compare by reference');
console.log("equality      : '1'==1 true, '1'===1 false, 0=='' true, NaN===NaN false");

const isMissing = (v) => v == null;          // the one deliberate use of ==
assert.deepEqual([null, undefined, 0, '', false].map(isMissing), [true, true, false, false, false]);

// --- shallow vs deep copy ---
const a = { user: { name: 'Ann' }, tags: ['x'], created: new Date(0) };
const shallow = { ...a };
shallow.user.name = 'Bob';
assert.equal(a.user.name, 'Bob', 'shallow copy shares nested objects');
const deep = structuredClone(a);
deep.user.name = 'Cy';
deep.tags.push('y');
assert.equal(a.user.name, 'Bob', 'deep copy is independent');
assert.deepEqual(a.tags, ['x']);
assert.ok(deep.created instanceof Date, 'structuredClone keeps Dates');
const viaJson = JSON.parse(JSON.stringify(a));
assert.equal(typeof viaJson.created, 'string', 'the old JSON trick turns Dates into strings');
assert.throws(() => structuredClone({ fn() {} }), /could not be cloned/, 'functions cannot be cloned');
console.log('copying       : spread shares nested objects; structuredClone copies deeply (keeps Dates)');

// --- falsy values ---
assert.deepEqual([false, 0, -0, 0n, '', null, undefined, NaN].filter(Boolean), []);
assert.equal(['0', [], {}, 'false'].filter(Boolean).length, 4);
const qty = 0;
assert.equal(qty || 10, 10, 'bug: a real 0 is replaced');
assert.equal(qty ?? 10, 0, '?? only replaces null/undefined');
console.log('falsy         : 0 || 10 =', qty || 10, '| 0 ?? 10 =', qty ?? 10);

// --- null vs undefined ---
let notSet;
assert.equal(notSet, undefined);
assert.equal({}.x, undefined);
assert.equal(typeof undefined, 'undefined');
assert.equal(typeof null, 'object', 'historic bug');
assert.equal(JSON.stringify({ a: undefined, b: null }), '{"b":null}');
assert.equal((() => {})(), undefined, 'no return value');
// Default parameters fire for undefined but not null
const f = (v = 'default') => v;
assert.equal(f(undefined), 'default');
assert.equal(f(null), null);
console.log('null/undef    : typeof null =', typeof null, '| JSON drops undefined:', JSON.stringify({ a: undefined, b: null }));
console.log('OK: equality, copying and falsy rules verified');
