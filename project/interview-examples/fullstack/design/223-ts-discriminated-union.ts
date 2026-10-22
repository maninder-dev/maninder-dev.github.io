// Topic 223: TypeScript Questions - discriminated unions and assertNever  (Full-Stack Handbook, Part 11)
// Run: npm run ex 223        (or: npx tsx 223-ts-discriminated-union.ts)
// What it shows: a union whose members share a literal `status` tag, so each switch branch sees only the
// fields of that member, and an exhaustive `default: assertNever(r)` that turns "forgot a case" into a
// compile error (proved in 223-ts-type-errors.ts) and a loud runtime error for bad data.
import assert from 'node:assert/strict';

function assertNever(x: never): never { throw new Error(`Unhandled: ${JSON.stringify(x)}`); }

type Result =
  | { status: 'ok'; data: string[] }
  | { status: 'error'; message: string }
  | { status: 'loading' };

function render(r: Result): string {
  switch (r.status) {
    case 'ok': return r.data.join(', ');            // r.data available here
    case 'error': return `Failed: ${r.message}`;    // r.message available here
    case 'loading': return 'Loading...';
    default: return assertNever(r);                 // r is `never` here: every case handled
  }
}

assert.equal(render({ status: 'ok', data: ['a', 'b'] }), 'a, b');
assert.equal(render({ status: 'error', message: 'timeout' }), 'Failed: timeout');
assert.equal(render({ status: 'loading' }), 'Loading...');
console.log('render        :', render({ status: 'ok', data: ['a', 'b'] }), '|', render({ status: 'error', message: 'timeout' }));

// Data from outside (an API) can still be wrong at runtime; assertNever fails loudly instead of returning undefined.
const fromApi = JSON.parse('{"status":"redirect","to":"/login"}') as Result;
assert.throws(() => render(fromApi), /Unhandled: \{"status":"redirect"/);
console.log('bad API data  : assertNever threw "Unhandled: ..."');

// The same idea models state machines and reducers
type Action = { type: 'add'; item: string } | { type: 'remove'; index: number } | { type: 'clear' };
function reducer(state: string[], action: Action): string[] {
  switch (action.type) {
    case 'add': return [...state, action.item];
    case 'remove': return state.filter((_, i) => i !== action.index);
    case 'clear': return [];
    default: return assertNever(action);
  }
}
const final = ([{ type: 'add', item: 'milk' }, { type: 'add', item: 'eggs' }, { type: 'remove', index: 0 }] as Action[]).reduce(reducer, []);
assert.deepEqual(final, ['eggs']);
console.log('reducer       : add milk, add eggs, remove 0 ->', final);

// Narrowing also works with `in` and with if/else on the tag
const describe = (r: Result) => ('data' in r ? `${r.data.length} items` : r.status === 'error' ? r.message : 'wait');
assert.equal(describe({ status: 'ok', data: ['x'] }), '1 items');
console.log('OK: discriminated union narrowed per branch; exhaustiveness enforced');
