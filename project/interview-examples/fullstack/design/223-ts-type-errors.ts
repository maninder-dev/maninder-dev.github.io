// Topic 223: TypeScript Questions - proving the compiler catches mistakes  (Full-Stack Handbook, Part 11)
// Run: npm run ex 223        (or: npx tsx 223-ts-type-errors.ts)
// What it shows: each `// @ts-expect-error` line below MUST be a type error. `tsc --noEmit` (run by
// npm test) fails if any of them stops being an error, so this file proves what the compiler rejects:
// unknown without narrowing, a missing switch case, wrong generic usage, readonly writes, and more.
// At runtime (tsx strips types) we only check the parts that are safe to execute.
import assert from 'node:assert/strict';

function assertNever(x: never): never { throw new Error(`Unhandled: ${JSON.stringify(x)}`); }

// 1. unknown must be narrowed before use
const u: unknown = JSON.parse('{"foo":1}');
// @ts-expect-error  'u' is of type 'unknown'
const bad1 = u.foo;

// 2. Adding a member to a union without handling it: assertNever gets a non-never argument
type Shape = { kind: 'circle'; r: number } | { kind: 'square'; side: number } | { kind: 'triangle'; base: number; h: number };
function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.r ** 2;
    case 'square': return s.side ** 2;
    // 'triangle' forgotten:
    // @ts-expect-error  Argument of type '{ kind: "triangle"; ... }' is not assignable to parameter of type 'never'
    default: return assertNever(s);
  }
}

// 3. Accessing a field that only exists on another member of the union
function radius(s: Shape) {
  // @ts-expect-error  Property 'r' does not exist on type 'Shape' (not narrowed)
  return s.r;
}

// 4. Generic constraint: the key must exist on the object
function get<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }
// @ts-expect-error  '"nmae"' is not assignable to '"id" | "name"'
get({ id: 1, name: 'Ann' }, 'nmae');

// 5. Literal union: typos in string values are caught
type Status = 'active' | 'banned';
// @ts-expect-error  '"actve"' is not assignable to type 'Status'
const st: Status = 'actve';

// 6. Readonly and Omit are enforced
type User = { readonly id: number; name: string; password: string };
const user: User = { id: 1, name: 'Ann', password: 'h' };
// @ts-expect-error  Cannot assign to 'id' because it is a read-only property
user.id = 2;
const pub: Omit<User, 'password'> = { id: 1, name: 'Ann' };
// @ts-expect-error  Property 'password' does not exist on type 'Omit<User, "password">'
pub.password;

// 7. Excess properties in object literals are rejected (catches typos in config objects)
type Options = { timeout?: number; retries?: number };
// @ts-expect-error  Object literal may only specify known properties, and 'retires' does not exist
const opts: Options = { timeout: 1000, retires: 3 };

// Runtime: the forgotten case really does blow up, which is what the compile error saved us from.
assert.equal(area({ kind: 'square', side: 3 }), 9);
assert.throws(() => area({ kind: 'triangle', base: 2, h: 3 }), /Unhandled/);
assert.equal(radius({ kind: 'square', side: 1 }), undefined);
void bad1; void st; void opts;
console.log('7 deliberate type errors are each marked with @ts-expect-error and verified by tsc --noEmit');
console.log('runtime       : forgotten "triangle" case throws Unhandled, exactly what tsc warned about');
console.log('OK: the compiler catches these mistakes before they run');
