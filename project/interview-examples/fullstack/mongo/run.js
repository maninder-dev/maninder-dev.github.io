// Runner. `npm run ex 63` runs the file(s) covering topic 63; `npm test` runs every example.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here).filter((f) => /^\d{3}(-\d{3})?-.*\.js$/.test(f)).sort();

const covers = (file, n) => {
  const [, a, b] = file.match(/^(\d{3})(?:-(\d{3}))?-/);
  return n >= Number(a) && n <= Number(b ?? a);
};

const arg = process.argv[2];
if (!arg) {
  console.log('Usage: npm run ex <topic>   |   npm test');
  process.exit(1);
}

const selected = arg === '--all' ? files : files.filter((f) => covers(f, Number(arg)));
if (!selected.length) {
  console.error(`No example for topic ${arg}`);
  process.exit(1);
}

const all = arg === '--all';
let failed = 0;
for (const f of selected) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [join(here, f)], {
    cwd: here,
    stdio: all ? 'pipe' : 'inherit',
    encoding: 'utf8',
    timeout: 180_000,
  });
  const ok = r.status === 0;
  if (!ok) failed++;
  if (all) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${f}  (${Date.now() - t0} ms)`);
    if (!ok) console.log((r.stdout || '') + (r.stderr || '') + (r.error ? String(r.error) : ''));
  }
}
if (all) console.log(`\n${selected.length - failed} passed, ${failed} failed, ${selected.length} total`);
process.exit(failed ? 1 : 0);
