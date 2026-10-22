// Runner.  npm run ex <topic>   -> run the file(s) covering that topic, output streamed
//          npm test             -> run every example, one PASS / FAIL / SKIP line each
// Files are named NNN-slug.js or NNN-MMM-slug.js (covers topics NNN..MMM).
// A file "skips" when it exits 0 and prints a line starting with "SKIPPED:".
// MySQL files share one throwaway database, so they run one at a time after the others.
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir)
  .map((f) => ({ f, m: f.match(/^(\d{3})(?:-(\d{3}))?-.+\.js$/) }))
  .filter(({ m }) => m)
  .map(({ f, m }) => ({ file: f, from: +m[1], to: +(m[2] ?? m[1]) }))
  .sort((a, b) => a.from - b.from || a.file.localeCompare(b.file));

function run(file, inherit) {
  return new Promise((resolve) => {
    const started = performance.now();
    const child = spawn(process.execPath, [file], { cwd: dir, stdio: inherit ? 'inherit' : 'pipe' });
    let out = '';
    child.stdout?.on('data', (d) => (out += d));
    child.stderr?.on('data', (d) => (out += d));
    child.on('close', (code) => resolve({ code, out, ms: performance.now() - started }));
  });
}

const arg = process.argv[2];
if (arg && arg !== '--all') {
  const topic = Number(arg);
  const matches = files.filter((x) => topic >= x.from && topic <= x.to);
  if (!matches.length) {
    console.error(`No example for topic ${arg}. Available: ${files.map((x) => x.file).join(', ')}`);
    process.exit(1);
  }
  let failed = false;
  for (const { file } of matches) {
    console.log(`\n=== ${file}`);
    const { code } = await run(file, true);
    failed ||= code !== 0;
  }
  process.exit(failed ? 1 : 0);
}

if (!arg) {
  console.log('Usage: npm run ex <topic-number>   |   npm test');
  process.exit(0);
}

const results = { pass: 0, skip: 0, fail: 0 };
const failures = [];
async function report(file) {
  const { code, out, ms } = await run(file, false);
  const skipLine = out.split('\n').find((l) => l.startsWith('SKIPPED:'));
  const status = code !== 0 ? 'FAIL' : skipLine ? 'SKIP' : 'PASS';
  results[status.toLowerCase()]++;
  console.log(`${status}  ${file.padEnd(46)} ${(ms / 1000).toFixed(1)}s${skipLine ? '  ' + skipLine.slice(9).trim() : ''}`);
  if (status === 'FAIL') failures.push({ file, out });
}

const parallel = files.filter((x) => !x.file.includes('mysql')).map((x) => x.file);
const serial = files.filter((x) => x.file.includes('mysql')).map((x) => x.file);
const workers = Math.max(2, Math.min(6, availableParallelism() - 1));
const queue = [...parallel];
await Promise.all(Array.from({ length: workers }, async () => {
  while (queue.length) await report(queue.shift());
}));
for (const file of serial) await report(file);

for (const { file, out } of failures) console.log(`\n=== output of failing ${file}\n${out}`);
console.log(`\n${results.pass} passed, ${results.skip} skipped, ${results.fail} failed (${files.length} files)`);
process.exit(results.fail ? 1 : 0);
