// Topic 223: TypeScript Questions - interface vs type, any/unknown, generics, utility types  (Full-Stack Handbook, Part 11)
// Run: npm run ex 223        (or: npx tsx 223-ts-types-generics.ts)
// What it shows: declaration merging (interface only), unions/intersections (type), unknown forcing
// narrowing where any lets a crash through, generics that keep input and output linked, and utility types.
// Type-level claims are checked by `tsc --noEmit` (part of npm test) via the Expect<Equal<...>> helpers;
// runtime claims are checked with assert.
import assert from 'node:assert/strict';

// Compile-time assertion helpers: a mismatch is a type error, so tsc fails.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

// ---------- interface vs type ----------
interface User { id: number; name: string }
interface User { email: string }                         // reopened: merged into one User
const u: User = { id: 1, name: 'Ann', email: 'ann@x.com' };
type _merged = Expect<Equal<keyof User, 'id' | 'name' | 'email'>>;

type Status = 'active' | 'banned';                       // union: only possible with `type`
type Admin = User & { permissions: string[] };           // intersection
const admin: Admin = { ...u, permissions: ['users:delete'] };
const statuses: Status[] = ['active', 'banned'];
console.log('interface/type:', Object.keys(admin).join(', '), '| statuses:', statuses.join(', '));

// ---------- any vs unknown ----------
const body = '{"foo":{"bar":1}}';
const a: any = JSON.parse('{}');
assert.throws(() => a.foo.bar(), TypeError, 'any compiles, then crashes at runtime');

function readBar(input: unknown): number | undefined {
  // input.foo;  <- would not compile: unknown must be narrowed first
  if (typeof input === 'object' && input !== null && 'foo' in input) {
    const foo = input.foo;
    if (typeof foo === 'object' && foo !== null && 'bar' in foo && typeof foo.bar === 'number') return foo.bar;
  }
  return undefined;
}
assert.equal(readBar(JSON.parse(body)), 1);
assert.equal(readBar(JSON.parse('{}')), undefined, 'unknown: the bad case is handled, not a crash');
assert.equal(readBar('nope'), undefined);
console.log('unknown       : readBar(valid)=1, readBar({})=undefined (no crash)');

// A type guard packages the narrowing for reuse
const isUser = (x: unknown): x is User =>
  typeof x === 'object' && x !== null && typeof (x as User).id === 'number' && typeof (x as User).email === 'string';
const parsed: unknown = JSON.parse('{"id":2,"name":"Bob","email":"bob@x.com"}');
if (isUser(parsed)) { const email: string = parsed.email; assert.equal(email, 'bob@x.com'); }
else assert.fail('should be a user');

// ---------- generics ----------
function first<T>(items: T[]): T | undefined { return items[0]; }
const n = first([1, 2, 3]);
const s = first(['a']);
type _first = Expect<Equal<typeof n, number | undefined>>;
type _firstS = Expect<Equal<typeof s, string | undefined>>;
assert.equal(n, 1);

// Constraint: K must be a key of T, and the return type follows the key
function pluck<T, K extends keyof T>(rows: T[], key: K): T[K][] { return rows.map((r) => r[key]); }
const ids = pluck([u, { ...u, id: 2 }], 'id');
type _pluck = Expect<Equal<typeof ids, number[]>>;
assert.deepEqual(ids, [1, 2]);

// Generic fetch-like loader (the handbook's getJson<T>, with a fake fetch so it runs offline)
async function getJson<T>(load: () => Promise<string>): Promise<T> { return JSON.parse(await load()) as T; }
const me = await getJson<{ id: number; name: string }>(async () => '{"id":7,"name":"Ann"}');
assert.equal(me.name, 'Ann');
console.log('generics      : first ->', n, '| pluck ids ->', ids, '| getJson ->', me.name);

// ---------- utility types ----------
type FullUser = { id: number; name: string; email: string; password: string };
type PublicUser = Omit<FullUser, 'password'>;
type UserUpdate = Partial<Pick<FullUser, 'name' | 'email'>>;
type RoleMap = Record<'admin' | 'editor', string[]>;
async function getCurrentUser() { return { id: 1, name: 'Ann', email: 'a@x.com' } as PublicUser | null; }
type Me = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

type _omit = Expect<Equal<keyof PublicUser, 'id' | 'name' | 'email'>>;
type _partial = Expect<Equal<UserUpdate, { name?: string; email?: string }>>;
type _me = Expect<Equal<Me, PublicUser>>;
type _req = Expect<Equal<Required<UserUpdate>, { name: string; email: string }>>;

const toPublic = ({ password: _pw, ...rest }: FullUser): PublicUser => rest;
const pub = toPublic({ id: 1, name: 'Ann', email: 'a@x.com', password: 'hash' });
assert.equal('password' in pub, false);
const patch: UserUpdate = { name: 'Ann B' };              // any subset is fine
const roles: RoleMap = { admin: ['*'], editor: ['posts:write'] };
assert.deepEqual(Object.keys(roles), ['admin', 'editor']);
console.log('utility types : PublicUser keys ->', Object.keys(pub).join(', '), '| patch ->', patch);
console.log('OK: type-level checks pass tsc; runtime checks pass assert');
