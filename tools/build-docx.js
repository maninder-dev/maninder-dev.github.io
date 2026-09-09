/* ------------------------------------------------------------------
   tools/build-docx.js

   Consumes the flat record array from model.js and emits a real OOXML
   .docx via the `docx` npm library — real Heading1/2/3 styles with
   outlineLvl, real numPr bullet lists (glyph lives in numbering.xml,
   never the text stream), real hyperlink relationships, single
   column, no table anywhere. No Word, no HTML import, so none of
   the NormalWeb / Times-New-Roman-in-table / DocSecurity artifacts
   that came from the old Word-COM pipeline can occur.

   Usage: node tools/build-docx.js [variant ...]
          node tools/build-docx.js            (builds all four)
------------------------------------------------------------------ */

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, ExternalHyperlink,
  AlignmentType, convertInchesToTwip, LevelFormat
} = require('docx');

const { buildModel } = require('./model.js');
const { CV } = require(path.join(__dirname, '..', 'cv-data.js'));

const DIST = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

const FONT = 'Calibri';
const BODY_SIZE = 21;   /* half-points: 10.5pt. Floor is 20 (10pt) — never go below it. */
const NAME_SIZE = 32;   /* 16pt */
const H1_SIZE = 24;     /* 12pt */
const H2_SIZE = 22;     /* 11pt */

const BULLET_LIST = 'ats-bullets';

function para(text, opts) {
  return new Paragraph(Object.assign({
    children: [new TextRun({ text, font: FONT, size: BODY_SIZE })],
    spacing: { after: 70 }
  }, opts || {}));
}

/* outlineLevel is 0-indexed (Heading1 = 0), unlike the HeadingLevel enum's
   1-indexed naming. Some parsers walk the outline tree rather than style
   names, so both must be set — docx's default heading styles set the style
   name but not outlineLvl. */
function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    outlineLevel: 1,
    children: [new TextRun({ text, font: FONT, size: H2_SIZE, bold: true })],
    spacing: { before: 140, after: 60 }
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    outlineLevel: 2,
    children: [new TextRun({ text, font: FONT, size: BODY_SIZE, bold: true })],
    spacing: { before: 80, after: 20 }
  });
}

function bulletPara(text) {
  return new Paragraph({
    numbering: { reference: BULLET_LIST, level: 0 },
    children: [new TextRun({ text, font: FONT, size: BODY_SIZE })],
    spacing: { after: 40 }
  });
}

function hyperlinePara(label, url) {
  return new Paragraph({
    children: [
      new ExternalHyperlink({
        link: url,
        children: [new TextRun({ text: label, font: FONT, size: BODY_SIZE, style: 'Hyperlink' })]
      })
    ],
    spacing: { after: 70 }
  });
}

function recordsToParagraphs(records) {
  const out = [];
  records.forEach((r) => {
    if (r.kind === 'heading') out.push(heading2(r.text));
    else if (r.kind === 'subhead') out.push(heading3(r.text));
    else if (r.kind === 'para') out.push(para(r.text));
    else if (r.kind === 'bullets') r.items.forEach((it) => out.push(bulletPara(it)));
    else if (r.kind === 'hyperline') out.push(hyperlinePara(r.label, r.url));
    else throw new Error('Unknown record kind: ' + r.kind);
  });
  return out;
}

function buildDoc(variantName) {
  const model = buildModel(variantName);

  const nameLine = new Paragraph({
    children: [new TextRun({ text: model.name, font: FONT, size: NAME_SIZE, bold: true })],
    spacing: { after: 20 }
  });
  const headlineLine = para(model.headline, { spacing: { after: 40 } });
  const contactLine1 = para(model.contactPrimary, { spacing: { after: 10 } });
  const contactLine2 = para(model.contactLinks, { spacing: { after: 120 } });

  const body = [nameLine, headlineLine, contactLine1, contactLine2]
    .concat(recordsToParagraphs(model.records));

  const doc = new Document({
    creator: model.name,
    title: model.name + ' - Resume',
    numbering: {
      config: [
        {
          reference: BULLET_LIST,
          levels: [
            { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: convertInchesToTwip(0.25), hanging: convertInchesToTwip(0.25) } } } }
          ]
        }
      ]
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.7),
              bottom: convertInchesToTwip(0.7),
              left: convertInchesToTwip(0.7),
              right: convertInchesToTwip(0.7)
            }
          }
        },
        children: body
      }
    ]
  });

  return { doc, model };
}

async function writeVariant(variantName) {
  const { doc, model } = buildDoc(variantName);
  const buf = await Packer.toBuffer(doc);
  const outPath = path.join(DIST, model.fileBase + '.docx');
  fs.writeFileSync(outPath, buf);
  console.log('wrote', outPath, '(' + buf.length + ' bytes)');
  if (model.datesEstimated) {
    console.warn('  !! WARNING: employment dates in this file are ESTIMATED. See cv-data.js DATES block. Replace before sending.');
  }
  return outPath;
}

async function main() {
  const requested = process.argv.slice(2);
  const variants = requested.length ? requested : Object.keys(CV.atsVariants);
  for (const v of variants) {
    await writeVariant(v);
  }
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { buildDoc, writeVariant };
