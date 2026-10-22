// Usage: npm run ex 144  -> runs the test file(s) for topic 144 (also matches ranges like 150-151).
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const n = Number(process.argv[2]);
if (!n) { console.error('Usage: npm run ex <topic number>'); process.exit(1); }
const files = readdirSync(new URL('../src', import.meta.url)).filter((f) => {
  const m = f.match(/^(\d{3})(?:-(\d{3}))?-.*\.test\.jsx$/);
  return m && n >= +m[1] && n <= +(m[2] ?? m[1]);
});
if (!files.length) { console.error(`No example for topic ${n}`); process.exit(1); }
const r = spawnSync('npx', ['vitest', 'run', ...files.map((f) => `src/${f}`)], { stdio: 'inherit', shell: true });
process.exit(r.status ?? 1);
