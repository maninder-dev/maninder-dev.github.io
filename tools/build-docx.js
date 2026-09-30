/* ------------------------------------------------------------------
   tools/build-docx.js

   Renders the model.js record list as a .docx styled after the
   reference resume (cv/sarwan_chaubeyV6-5-1.pdf): centered spaced
   name and title, a boxed contact bar, purple ruled section headings,
   title-left / date-right job headers, bold key terms in bullets, and
   projects with Tech Stack and My Role blocks.

   The look is built only from ATS-safe Word primitives: no table, no
   text box, no columns, no image, no header/footer. The reference's
   4-column skills grid becomes 'Label: a, b, c' lines, and its boxed
   contact row is one bordered paragraph, not a table.

   Usage: node tools/build-docx.js [variant ...]   (default: all four)
------------------------------------------------------------------ */

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, ExternalHyperlink, Tab,
  AlignmentType, TabStopType, BorderStyle, UnderlineType, LevelFormat, convertInchesToTwip
} = require('docx');

const { buildModel, runs } = require('./model.js');
const { CV } = require(path.join(__dirname, '..', 'cv-data.js'));

const LATEST_CV = path.join(__dirname, '..', 'latestCV');

const FONT = 'Calibri';
const ACCENT = '5B4B8A';
const ACCENT_SOFT = '7A68B0';
const RULE = 'B4A7D6';
const INK = '222222';

/* Sizes in half-points. Nothing below 20 (10pt) — verify-docx.sh enforces it. */
const SZ = { name: 48, headline: 24, contact: 20, h2: 23, h3: 21, body: 20 };

/* A4, 0.6in margins. The right tab stop for job dates sits on the right margin. */
const PAGE_W = 11906;
const MARGIN = convertInchesToTwip(0.6);
const MARGIN_V = convertInchesToTwip(0.5);
const RIGHT_EDGE = PAGE_W - 2 * MARGIN;

const BULLETS = 'resume-bullets';

function textRuns(s, base) {
  return runs(s).map((r) => new TextRun(Object.assign({ font: FONT, size: SZ.body, color: INK }, base, { text: r.text, bold: r.bold || (base && base.bold) })));
}

function header(r) {
  const out = [];
  out.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 20 },
    children: [new TextRun({ text: r.name, font: FONT, size: SZ.name, bold: true, allCaps: true, characterSpacing: 40, color: ACCENT })]
  }));
  out.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: r.headline, font: FONT, size: SZ.headline, allCaps: true, characterSpacing: 20, color: ACCENT })]
  }));

  const box = { style: BorderStyle.SINGLE, size: 12, color: RULE, space: 4 };
  const children = [];
  r.contacts.forEach((c, i) => {
    if (i > 0) children.push(new TextRun({ text: '  |  ', font: FONT, size: SZ.contact, color: RULE }));
    const run = new TextRun({ text: c.text, font: FONT, size: SZ.contact, bold: true, color: '333333' });
    children.push(c.url ? new ExternalHyperlink({ link: c.url, children: [run] }) : run);
  });
  out.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { top: box, bottom: box, left: box, right: box },
    spacing: { before: 40, after: 120 },
    children
  }));
  return out;
}

function heading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    outlineLevel: 1,
    spacing: { before: 130, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 2 } },
    children: [new TextRun({ text, font: FONT, size: SZ.h2, bold: true, allCaps: true, characterSpacing: 18, color: ACCENT })]
  });
}

function para(text, left) {
  return new Paragraph({ alignment: left ? AlignmentType.LEFT : AlignmentType.JUSTIFIED, spacing: { after: 60 }, children: textRuns(text) });
}

function bullet(text) {
  return new Paragraph({ numbering: { reference: BULLETS, level: 0 }, spacing: { after: 20 }, children: textRuns(text) });
}

function labelled(label, value) {
  return new Paragraph({
    spacing: { after: 30 },
    children: [
      new TextRun({ text: label + ': ', font: FONT, size: SZ.body, bold: true, color: ACCENT }),
      new TextRun({ text: value, font: FONT, size: SZ.body, color: INK })
    ]
  });
}

/* Title on the left, dates right-aligned on a tab stop. The spaces either
   side of the tab matter: an extractor that drops <w:tab/> would otherwise
   glue 'Engineer' onto 'March' — the same bug class as the old 'PunjabGuru'. */
function jobhead(r) {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      outlineLevel: 2,
      tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_EDGE }],
      spacing: { before: 110, after: 0 },
      children: [
        new TextRun({ text: r.title, font: FONT, size: SZ.h3, bold: true, allCaps: true, underline: { type: UnderlineType.SINGLE, color: ACCENT }, color: ACCENT }),
      ].concat(r.dates ? [new TextRun({ children: [' ', new Tab(), ' ' + r.dates], font: FONT, size: SZ.body, color: ACCENT_SOFT })] : [])
    }),
    new Paragraph({
      spacing: { after: 50 },
      children: [new TextRun({ text: r.org, font: FONT, size: SZ.body, color: ACCENT_SOFT })]
    })
  ];
}

function project(r) {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      outlineLevel: 2,
      spacing: { before: 90, after: 20 },
      children: [new TextRun({ text: r.title, font: FONT, size: SZ.h3, bold: true, color: ACCENT })].concat(
        ...r.links.map((l) => [
          new TextRun({ text: '  |  ', font: FONT, size: SZ.body, color: RULE }),
          new ExternalHyperlink({ link: l.url, children: [new TextRun({ text: l.label, font: FONT, size: SZ.body, color: ACCENT_SOFT, underline: { type: UnderlineType.SINGLE } })] })
        ])
      )
    }),
    new Paragraph({ spacing: { after: 30 }, children: textRuns(r.desc, { italics: true }) })
  ].concat(r.tech.length ? [labelled('Tech Stack', r.tech.join(', '))] : []).concat([
    new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: 'My Role:', font: FONT, size: SZ.body, bold: true, color: ACCENT })] })
  ]).concat(r.role.map(bullet));
}

function link(r) {
  return new Paragraph({
    spacing: { before: 80, after: 40 },
    children: textRuns(r.text + ' ').concat([
      new ExternalHyperlink({ link: r.url, children: [new TextRun({ text: r.label, font: FONT, size: SZ.body, color: ACCENT, underline: { type: UnderlineType.SINGLE } })] })
    ])
  });
}

function subgroup(text) {
  return new Paragraph({
    spacing: { before: 60, after: 20 },
    children: [new TextRun({ text, font: FONT, size: SZ.h3, bold: true, color: ACCENT })]
  });
}

/* Linked project name, then its description, all in one bullet paragraph. */
function linkBullet(it) {
  const name = new TextRun({ text: it.label, font: FONT, size: SZ.body, bold: true, color: ACCENT });
  return new Paragraph({
    numbering: { reference: BULLETS, level: 0 },
    spacing: { after: 20 },
    children: [it.url ? new ExternalHyperlink({ link: it.url, children: [name] }) : name]
      .concat([new TextRun({ text: ': ' + it.text, font: FONT, size: SZ.body, color: INK })])
  });
}

function render(records) {
  const out = [];
  records.forEach((r) => {
    switch (r.kind) {
      case 'header': out.push(...header(r)); break;
      case 'heading': out.push(heading(r.text)); break;
      case 'para': out.push(para(r.text, r.left)); break;
      case 'bullets': out.push(...r.items.map(bullet)); break;
      case 'skill': out.push(labelled(r.label, r.items.join(', '))); break;
      case 'jobhead': out.push(...jobhead(r)); break;
      case 'project': out.push(...project(r)); break;
      case 'link': out.push(link(r)); break;
      case 'subgroup': out.push(subgroup(r.text)); break;
      case 'linkbullets': out.push(...r.items.map(linkBullet)); break;
      default: throw new Error('Unknown record kind: ' + r.kind);
    }
  });
  return out;
}

function buildDoc(variantName) {
  const model = buildModel(variantName);
  const doc = new Document({
    creator: CV.name,
    title: CV.name + ' - Resume',
    styles: { default: { document: { run: { font: FONT, size: SZ.body } } } },
    numbering: {
      config: [{
        reference: BULLETS,
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: convertInchesToTwip(0.22), hanging: convertInchesToTwip(0.18) } } }
        }]
      }]
    },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_W, height: 16838 },
          margin: { top: MARGIN_V, bottom: MARGIN_V, left: MARGIN, right: MARGIN }
        }
      },
      children: render(model.records)
    }]
  });
  return { doc, model };
}

async function writeVariant(variantName) {
  const { doc, model } = buildDoc(variantName);
  const buf = await Packer.toBuffer(doc);
  if (!fs.existsSync(LATEST_CV)) fs.mkdirSync(LATEST_CV, { recursive: true });
  const outPath = path.join(LATEST_CV, model.fileBase + '.docx');
  fs.writeFileSync(outPath, buf);
  console.log('wrote', outPath);
  if (model.datesEstimated) console.warn('  !! employment dates are ESTIMATED (cv-data.js DATES) - replace before sending');
  return outPath;
}

async function main() {
  const requested = process.argv.slice(2);
  for (const v of (requested.length ? requested : Object.keys(CV.atsVariants))) await writeVariant(v);
}

if (require.main === module) main().catch((err) => { console.error(err); process.exit(1); });

module.exports = { buildDoc, writeVariant };
