/* ------------------------------------------------------------------
   tools/build-txt.js

   Renders the model.js record list as a plain-text resume: for pasting
   into application forms, and as the golden file verify-docx.sh diffs
   the .docx text stream against.

   Usage: node tools/build-txt.js [variant ...]      (default: all four)
          node tools/build-txt.js master --stdout
------------------------------------------------------------------ */

const fs = require('fs');
const path = require('path');
const { buildModel, plain } = require('./model.js');
const { CV } = require(path.join(__dirname, '..', 'cv-data.js'));

const LATEST_CV = path.join(__dirname, '..', 'latestCV');

function recordLines(r) {
  switch (r.kind) {
    case 'header':
      return [r.name, r.headline,r.contacts.map((c) => c.text).join(' | ')];
    case 'heading':
    case 'para':
      return [plain(r.text)];
    case 'bullets':
      return r.items.map(plain);
    case 'skill':
      return [`${r.label}: ${r.items.join(', ')}`];
    case 'jobhead':
      return [r.dates ? `${r.title}\t${r.dates}` : r.title, r.org];
    case 'project':
      return [[r.title].concat(r.links.map((l) => l.label)).join(' | '), plain(r.desc)]
        .concat(r.tech.length ? [`Tech Stack: ${r.tech.join(', ')}`] : [])
        .concat(['My Role:'], r.role.map(plain));
    case 'link':
      return [`${r.text} ${r.label}`];
    case 'subgroup':
      return [r.text];
    case 'linkbullets':
      return r.items.map((it) => `${it.label}: ${it.text}`);
    default:
      throw new Error('Unknown record kind: ' + r.kind);
  }
}

function renderVariant(variantName) {
  const { records } = buildModel(variantName);
  return records.flatMap(recordLines).join('\n') + '\n';
}

function main() {
  const args = process.argv.slice(2);
  const stdoutOnly = args.includes('--stdout');
  const requested = args.filter((a) => a !== '--stdout');
  const list = requested.length ? requested : Object.keys(CV.atsVariants);

  list.forEach((v) => {
    const text = renderVariant(v);
    if (stdoutOnly) { process.stdout.write(text); return; }
    if (!fs.existsSync(LATEST_CV)) fs.mkdirSync(LATEST_CV, { recursive: true });
    const outPath = path.join(LATEST_CV, buildModel(v).fileBase + '.txt');
    fs.writeFileSync(outPath, text, 'utf8');
    console.log('wrote', outPath);
  });
}

if (require.main === module) main();

module.exports = { renderVariant };
