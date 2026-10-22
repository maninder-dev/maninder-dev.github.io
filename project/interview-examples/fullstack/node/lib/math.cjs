// CommonJS module used by 112-modules-cjs-vs-esm.js
let loads = (globalThis.__mathLoads ?? 0) + 1;
globalThis.__mathLoads = loads;
module.exports = { add: (a, b) => a + b, kind: typeof require === 'function' ? 'commonjs' : 'esm' };
