/* ------------------------------------------------------------------
   tools/model.js

   Turns cv-data.js into a flat, variant-aware ATS document model:
   an ordered array of { kind, text, ... } records. build-docx.js and
   build-txt.js BOTH consume this array and nothing else — neither
   file contains a single literal template string of its own. That is
   what makes the shipped .txt a genuine parse-fidelity proof against
   the .docx rather than a tautology: if a record's text ever relied
   on something a .docx-only mechanism could mangle (a table cell
   boundary, a <w:br/>), the .txt would show the same mangled text,
   and the drift check in verify-docx.sh would still pass — so the
   real defence is that this file never emits a table, a <w:br/>, or
   a middot in the first place.

   Record kinds:
     heading   { text }                         -> Heading2, own paragraph
     subhead   { text }                         -> Heading3, own paragraph
     para      { text }                         -> plain paragraph
     bullets   { items: [text, ...] }           -> one numbered list
     hyperline { label, url }                   -> plain paragraph, bare
                                                    domain as hyperlink text
   ------------------------------------------------------------------ */

const path = require('path');
const { CV, fmtRange } = require(path.join(__dirname, '..', 'cv-data.js'));

/* Words a bare '&' would block a degree/heading dictionary lookup on --
   already avoided at the source in cv-data.js, asserted here so a future
   edit to cv-data.js can't silently reintroduce one. */
function assertNoAmpersandInHeadings(headings) {
  headings.forEach((h) => {
    if (h.includes('&')) throw new Error(`Heading "${h}" contains '&' — breaks heading-dictionary matching`);
  });
}

const HEADINGS = ['Professional Summary', 'Technical Skills', 'Professional Experience', 'Projects', 'Education'];
assertNoAmpersandInHeadings(HEADINGS);

/* Strip the <strong> tags cv-data.js uses for web emphasis. The .docx
   applies bold via run styling elsewhere (job company names, headings) —
   summary emphasis doesn't need to survive into the text stream, and
   leaving the tags in would put literal angle brackets in the resume. */
function stripTags(s) {
  return String(s).replace(/<\/?strong>/g, '');
}

/* One 'Label: a, b, c' line per skills group. No middot, no '/' inside an
   item (some tokenizers split on '/' and some don't), no terminal period. */
function skillsLines(skillGroups) {
  return skillGroups.map((g) => `${g.group}: ${g.items.join(', ')}`);
}

/* Employer line: title, company, location, then a pipe and the date range —
   see cv-data.js fmtRange. Comma-separated first three fields is the
   highest-confidence separator for resume-parsing vendors; the pipe before
   the dates is never mistaken for a range separator, unlike an em dash. */
function employerLine(job) {
  return `${job.role}, ${job.company}, ${job.location} | ${fmtRange(job)}`;
}

function educationLine(e) {
  return `${e.degree}, ${e.school} (${e.university}), ${e.location} | ${e.gradYear}`;
}

/* Six featured Shopware projects: tech front-loaded (not the domain), no
   [bracketed] tags — brackets are frequently stripped as markup by resume
   normalisers, which is exactly where the old document buried its most
   valuable per-project keywords. */
function shopwareProjectLine(p) {
  return `${p.name} - ${p.atsTech}: ${p.atsDesc}.`;
}

/* Build the flat record list for one named variant ('master' | 'shopware' |
   'product' | 'services'). Returns { records, contactLine1, contactLine2,
   headline, meta } — build-docx.js and build-txt.js both take this shape. */
function buildModel(variantName) {
  const variant = CV.atsVariants[variantName];
  if (!variant) throw new Error(`Unknown ATS variant "${variantName}"`);

  const shopwareItems = CV.projects
    .find((c) => c.category === 'Shopware & eCommerce')
    .items.filter((p) => p.featured);

  const skillGroups = CV.skills.concat([{ group: 'Leadership', items: CV.leadership }]);

  const summaryParas = CV.summary.map(stripTags);

  const sectionBuilders = {
    summary: () => [{ kind: 'heading', text: 'Professional Summary' }]
      .concat(summaryParas.map((text) => ({ kind: 'para', text }))),

    skills: () => [{ kind: 'heading', text: 'Technical Skills' }]
      .concat(skillsLines(skillGroups).map((line) => ({ kind: 'para', text: line }))),

    experience: () => {
      const out = [{ kind: 'heading', text: 'Professional Experience' }];
      CV.experience.forEach((job) => {
        out.push({ kind: 'subhead', text: employerLine(job) });
        out.push({ kind: 'bullets', items: job.points });
      });
      return out;
    },

    projects: () => [
      { kind: 'heading', text: 'Projects' },
      { kind: 'subhead', text: 'Selected Shopware and eCommerce Builds' },
      { kind: 'bullets', items: shopwareItems.map((p) => shopwareProjectLine(p)) },
      { kind: 'para', text: CV.atsProfile.portfolioLine },
      { kind: 'hyperline', label: 'maninder-dev.github.io', url: CV.atsProfile.portfolioUrl }
    ],

    education: () => [
      { kind: 'heading', text: 'Education' },
      { kind: 'para', text: educationLine(CV.education[0]) }
    ]
  };

  const records = [];
  variant.sections.forEach((key) => {
    const build = sectionBuilders[key];
    if (!build) throw new Error(`Unknown section "${key}" in variant "${variantName}"`);
    records.push(...build());
  });

  const contactPrimary = CV.contact
    .filter((c) => ['Location', 'Phone', 'Email'].includes(c.label))
    .map((c) => c.ats || c.value)
    .join(' | ');
  const contactLinks = CV.contact
    .filter((c) => ['LinkedIn', 'GitHub', 'Portfolio'].includes(c.label))
    .map((c) => c.value)
    .join(' | ');

  return {
    records,
    name: CV.name,
    headline: variant.headline,
    contactPrimary,
    contactLinks,
    fileBase: variant.file,
    datesEstimated: CV.dates.datesEstimated
  };
}

module.exports = { buildModel, stripTags, skillsLines, employerLine, educationLine, shopwareProjectLine, HEADINGS };

if (require.main === module) {
  const which = process.argv[2] || 'master';
  const m = buildModel(which);
  console.log(`=== ${which} -> ${m.fileBase} ===`);
  console.log(m.name);
  console.log(m.headline);
  console.log(m.contactPrimary);
  console.log(m.contactLinks);
  m.records.forEach((r) => {
    if (r.kind === 'bullets') r.items.forEach((it) => console.log('  * ' + it));
    else if (r.kind === 'hyperline') console.log(`[link] ${r.label} -> ${r.url}`);
    else console.log(`[${r.kind}] ${r.text}`);
  });
}
