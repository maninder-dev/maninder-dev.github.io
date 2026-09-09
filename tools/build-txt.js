/* ------------------------------------------------------------------
   tools/build-txt.js

   Renders the SAME flat record array from model.js (not the .docx
   itself) into a plain-text resume. Because both build-docx.js and
   this file consume model.js and nothing else, diffing this .txt
   against the text extracted from the .docx is a genuine parse-
   fidelity proof rather than a tautology — see verify-docx.sh.

   Usage: node tools/build-txt.js [variant ...]
          node tools/build-txt.js               (builds all four)
          node tools/build-txt.js master --stdout   (prints, no file write)
------------------------------------------------------------------ */

const fs = require('fs');
const path = require('path');
const { buildModel } = require('./model.js');
const { CV } = require(path.join(__dirname, '..', 'cv-data.js'));

const DIST = path.join(__dirname, '..', 'dist');

function recordsToLines(records) {
  const lines = [];
  records.forEach((r) => {
    if (r.kind === 'heading' || r.kind === 'subhead' || r.kind === 'para') lines.push(r.text);
    else if (r.kind === 'bullets') r.items.forEach((it) => lines.push(it));
    else if (r.kind === 'hyperline') lines.push(r.label);
    else throw new Error('Unknown record kind: ' + r.kind);
  });
  return lines;
}

function renderVariant(variantName) {
  const model = buildModel(variantName);
  const lines = [model.name, model.headline, model.contactPrimary, model.contactLinks]
    .concat(recordsToLines(model.records));
  return lines.join('\n') + '\n';
}

function main() {
  const args = process.argv.slice(2);
  const stdoutOnly = args.includes('--stdout');
  const variants = args.filter((a) => a !== '--stdout');
  const list = variants.length ? variants : Object.keys(CV.atsVariants);

  list.forEach((v) => {
    const text = renderVariant(v);
    if (stdoutOnly) {
      process.stdout.write(text);
      return;
    }
    if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });
    const model = buildModel(v);
    const outPath = path.join(DIST, model.fileBase + '.txt');
    fs.writeFileSync(outPath, text, 'utf8');
    console.log('wrote', outPath, '(' + Buffer.byteLength(text, 'utf8') + ' bytes)');
  });
}

if (require.main === module) main();

module.exports = { renderVariant };
