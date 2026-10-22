// Topic 109: What is libuv?  (Full-Stack Handbook, Part 6)
// Run: npm run ex 109        (or: node 109-libuv-thread-pool.js)
// What it shows: async pbkdf2 runs on libuv's 4-thread pool, so hashes 5 and 6 queue behind the
// first four. Re-running with UV_THREADPOOL_SIZE=8 (must be set before startup) removes the wait.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import os from 'node:os';

if (process.argv[2] === '--measure') {
  // Child mode: start 6 hashes at once and report when each one finished
  const start = Date.now();
  const done = [];
  for (let i = 1; i <= 6; i++) {
    crypto.pbkdf2('pw', 'salt', 100000, 64, 'sha512', () => {
      done.push({ i, ms: Date.now() - start });
      if (done.length === 6) console.log(JSON.stringify(done));
    });
  }
} else {
  const measure = (size) => {
    const r = spawnSync(process.execPath, [import.meta.filename, '--measure'],
      { env: { ...process.env, UV_THREADPOOL_SIZE: String(size) }, encoding: 'utf8' });
    return JSON.parse(r.stdout).sort((x, y) => x.i - y.i);
  };
  const spread = (d) => Math.max(...d.map((x) => x.ms)) / Math.min(...d.map((x) => x.ms));

  const pool4 = measure(4);
  pool4.forEach(({ i, ms }) => console.log(`pool=4  hash ${i}: ${ms} ms`));
  const firstFour = pool4.slice(0, 4).map((d) => d.ms);
  const lastTwo = Math.min(pool4[4].ms, pool4[5].ms);
  // Hashes 5 and 6 cannot start until a thread frees up, so they finish clearly later.
  assert.ok(lastTwo > Math.min(...firstFour) * 1.3, 'hashes 5-6 waited for a free thread');

  if (os.cpus().length >= 6) {
    const pool8 = measure(8);
    console.log(`finish spread  pool=4: x${spread(pool4).toFixed(2)}   pool=8: x${spread(pool8).toFixed(2)}`);
    assert.ok(spread(pool8) < spread(pool4), 'with 8 threads all six hashes run in one wave');
  }
  console.log('OK');
}
