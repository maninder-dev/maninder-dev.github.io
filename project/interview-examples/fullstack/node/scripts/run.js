// Runner for the examples.
//   npm test          -> run every NNN-*.js file, print PASS/FAIL per file, exit 1 on any failure
//   npm run ex 110    -> run the file(s) for topic 110 with live output (ranges like 106-107 match too)
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = readdirSync(root).filter((f) => /^\d{3}(-\d{3})?-.+\.js$/.test(f)).sort();

function covers(file, topic) {
  const [, from, to] = file.match(/^(\d{3})(?:-(\d{3}))?-/);
  return topic >= Number(from) && topic <= Number(to ?? from);
}

function run(file, inherit) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(process.execPath, [file], { cwd: root, stdio: inherit ? 'inherit' : 'pipe' });
    let out = '';
    child.stdout?.on('data', (d) => (out += d));
    child.stderr?.on('data', (d) => (out += d));
    const timer = setTimeout(() => { out += '\n[runner] timed out after 60s'; child.kill(); }, 60_000);
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, out, ms: Date.now() - start }); });
  });
}

const args = process.argv.slice(2);
if (args[0] === '--one') {
  const topic = Number(args[1]);
  const picked = files.filter((f) => covers(f, topic));
  if (!picked.length) { console.error(`No example for topic ${args[1]}. Usage: npm run ex <topic>`); process.exit(1); }
  let failed = 0;
  for (const f of picked) {
    console.log(`\n=== ${f} ===`);
    if ((await run(f, true)).code !== 0) failed++;
  }
  process.exit(failed ? 1 : 0);
}

let passed = 0, failed = 0;
for (const f of files) {
  const { code, out, ms } = await run(f, false);
  if (code === 0) { passed++; console.log(`PASS  ${f}  (${ms} ms)`); }
  else { failed++; console.log(`FAIL  ${f}  (exit ${code})\n${out.replace(/^/gm, '    ')}`); }
}
console.log(`\n${passed} passed, ${failed} failed, ${files.length} files`);
process.exit(failed ? 1 : 0);
