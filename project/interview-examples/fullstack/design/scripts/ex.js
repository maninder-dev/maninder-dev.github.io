// npm run ex <topic>: runs the example file(s) covering one topic number.
import { exampleFiles, runFile, topicsOf } from './files.js';

const topic = Number(process.argv[2]);
if (!topic) { console.error('Usage: npm run ex <topic-number>'); process.exit(2); }
const files = exampleFiles().filter((f) => { const { from, to } = topicsOf(f); return topic >= from && topic <= to; });
if (!files.length) { console.error(`No example for topic ${topic}`); process.exit(1); }
let failed = 0;
for (const file of files) {
  console.log(`\n=== ${file} ===`);
  const { code } = await runFile(file);
  if (code !== 0) failed++;
}
process.exit(failed ? 1 : 0);
