// Topic 215: Why hash passwords with bcrypt instead of SHA-256?  (Full-Stack Handbook, Part 11)
// Run: npm run ex 215        (or: node 215-password-hashing.js)
// What it shows: SHA-256 is deterministic and fast, so a precomputed lookup table cracks it instantly and
// guessing runs at hundreds of thousands per second even in plain JS. bcrypt is salted (same password, different hash) and slow
// by design; each extra cost point doubles the work. Uses bcryptjs (pure JS, no native build on Windows),
// which is slower than native bcrypt, so cost 10 here takes roughly what cost 12 takes natively.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';

const sha = (s) => createHash('sha256').update(s).digest('hex');

// --- SHA-256: same input, same output -> lookup tables work ---
assert.equal(sha('password123'), sha('password123'));
const common = ['123456', 'password', 'qwerty', 'password123', 'iloveyou', 'admin', 'letmein'];
const rainbow = new Map(common.map((p) => [sha(p), p]));    // built once, reused against every breach
const leakedShaHashes = [sha('password123'), sha('letmein'), sha('correct horse battery staple')];
const cracked = leakedShaHashes.map((h) => rainbow.get(h)).filter(Boolean);
console.log('sha256 leak   : cracked by table lookup ->', cracked);
assert.deepEqual(cracked, ['password123', 'letmein']);

// Guess rate
let n = 0;
const t0 = performance.now();
while (performance.now() - t0 < 200) { sha('guess' + n); n++; }
const shaPerSec = Math.round(n / 0.2);
console.log(`sha256 speed  : ~${shaPerSec.toLocaleString()} guesses/s on one JS thread (GPUs: billions)`);

// --- bcrypt: salted and slow ---
const h1 = await bcrypt.hash('password123', 10);
const h2 = await bcrypt.hash('password123', 10);
console.log('bcrypt hash 1 :', h1);
console.log('bcrypt hash 2 :', h2);
assert.notEqual(h1, h2, 'random salt: identical passwords get different hashes');
assert.match(h1, /^\$2[aby]\$10\$/, 'algorithm and cost are stored inside the hash');
assert.equal(await bcrypt.compare('password123', h1), true);
assert.equal(await bcrypt.compare('password124', h1), false);
assert.equal(rainbow.get(h1), undefined, 'precomputed tables are useless');

const time = async (cost) => { const t = performance.now(); await bcrypt.hash('x', cost); return performance.now() - t; };
const t8 = await time(8);
const t10 = await time(10);
console.log(`bcrypt cost 8 : ${t8.toFixed(0)} ms/guess   cost 10: ${t10.toFixed(0)} ms/guess  (x${(t10 / t8).toFixed(1)}, expected ~x4)`);
assert.ok(t10 > t8 * 2.5, 'each +1 cost doubles the work');
const slowdown = Math.round(shaPerSec * (t10 / 1000));
console.log(`bcrypt is ~${slowdown.toLocaleString()}x more work per guess than sha256 here`);
assert.ok(slowdown > 1000);

// Rehash on login when you raise the cost later
const needsRehash = (hash, wanted) => bcrypt.getRounds(hash) < wanted;
assert.equal(needsRehash(h1, 12), true);
console.log('OK: never store fast unsalted hashes; use bcrypt/argon2 with a tuned cost');
