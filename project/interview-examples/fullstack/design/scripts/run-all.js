// npm test: runs every example file and prints one PASS/FAIL line per file.
import { exampleFiles, runFile } from './files.js';

const files = exampleFiles();
let failed = 0;
const started = Date.now();
for (const file of files) {
  const t0 = Date.now();
  const { code, out } = await runFile(file, { quiet: true });
  const ms = Date.now() - t0;
  if (code === 0) console.log(`PASS  ${file}  (${ms} ms)`);
  else { failed++; console.log(`FAIL  ${file}  (exit ${code})\n${out.split('\n').map((l) => '      ' + l).join('\n')}`); }
}
console.log(`\n${files.length - failed}/${files.length} examples passed in ${((Date.now() - started) / 1000).toFixed(1)} s`);
process.exit(failed ? 1 : 0);
