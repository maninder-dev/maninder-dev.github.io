/* ------------------------------------------------------------------
   tools/model.js

   Turns cv-data.js into an ordered, variant-aware list of layout
   records. build-docx.js and build-txt.js BOTH render this list and
   contain no resume text of their own, which is what makes diffing
   the .docx text stream against the .txt a real fidelity check.

   Text fields may contain <strong>...</strong>: the .docx renders it
   as bold runs, the .txt strips it.

   Record kinds:
     header    { name, headline, contacts: [{ text, url }] }
     heading   { text }                         section title
     para      { text }
     bullets   { items: [text] }
     skill     { label, items: [text] }         'Label: a, b, c'
     jobhead   { title, dates, org }            title ...... dates / org
     project   { title, links: [{ label, url }], desc, tech: [], role: [] }
     link      { text, label, url }             text + hyperlinked label
     subgroup  { text }                         small group title
     linkbullets { items: [{ label, url, text }] }  bullet: linked name + text
   ------------------------------------------------------------------ */

const path = require('path');
const { CV, fmtRange } = require(path.join(__dirname, '..', 'cv-data.js'));

const HEADINGS = ['Summary', 'Technical Skills', 'Work Experience', 'Projects', 'Education'];

function plain(s) {
  return String(s).replace(/<\/?strong>/g, '');
}

/* Split 'a <strong>b</strong> c' into [{text:'a ', bold:false}, {text:'b', bold:true}, ...]. */
function runs(s) {
  const out = [];
  String(s).split(/(<strong>.*?<\/strong>)/g).forEach((part) => {
    if (!part) return;
    const m = part.match(/^<strong>(.*)<\/strong>$/);
    out.push(m ? { text: m[1], bold: true } : { text: part, bold: false });
  });
  return out;
}

function contacts() {
  const pick = (label) => CV.contact.find((c) => c.label === label && !c.placeholder);
  return ['Phone', 'Email', 'LinkedIn', 'Location']
    .map(pick)
    .filter(Boolean)
    .map((c) => ({
      text: c.ats || c.value,
      url: c.href && !c.href.startsWith('tel:') ? c.href : null
    }));
}

function buildModel(variantName) {
  const variant = CV.atsVariants[variantName];
  if (!variant) throw new Error(`Unknown ATS variant "${variantName}"`);

  /* The variant's role line first, then its preferred groups, then the rest. */
  function orderedSkills() {
    const order = variant.skillOrder || [];
    const rank = (g) => (order.includes(g.group) ? order.indexOf(g.group) : order.length);
    const groups = CV.skills.slice().sort((a, b) => rank(a) - rank(b));
    return (variant.coreSkills ? [variant.coreSkills] : []).concat(groups);
  }

  const sections = {
    summary: () => [{ kind: 'heading', text: 'Summary' }]
      .concat((variant.summary ? [variant.summary] : CV.atsSummary ? [CV.atsSummary] : CV.summary).map((text) => ({ kind: 'para', text }))),

    skills: () => [{ kind: 'heading', text: 'Technical Skills' }]
      .concat(orderedSkills().map((g) => ({ kind: 'skill', label: g.group, items: g.items }))),

    experience: () => {
      const out = [{ kind: 'heading', text: 'Work Experience' }];
      CV.experience.filter((job) => !(CV.atsProfile.hideJobs || []).includes(job.company)).forEach((job) => {
        out.push({ kind: 'jobhead', title: job.role, dates: fmtRange(job), org: `${job.company}, ${job.location}` });
        out.push({ kind: 'bullets', items: job.atsPoints || job.points });
      });
      return out;
    },

    /* One Projects section in the category layout: the newest projects as
       their own category first, then the web page categories. Hidden
       categories and offline sites are left out; dead product links are
       dropped but the product stays. */
    projects: () => {
      const P = CV.atsProfile;
      const offline = new Set(P.offline);
      const host = (u) => (u ? u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '') : null);
      const isOffline = (p) => offline.has(p.name.replace(/^www\./, '')) || offline.has(host(p.url));
      const cats = [{
        category: P.featuredCategory,
        items: (variant.featured || P.featured).map((k) => {
          const p = CV.atsProjects[k];
          if (!p) throw new Error(`Unknown featured project "${k}"`);
          return { label: p.links[0].label, url: p.links[0].url, text: `${p.brief} (${p.tech.join(', ')})` };
        })
      }].concat(CV.projects
        .filter((c) => !P.hideCategories.includes(c.category))
        .map((c) => ({
          category: c.category,
          items: c.items.filter((p) => !isOffline(p)).map((p) => ({
            label: p.name,
            url: P.unlink.includes(p.name) ? null : p.url,
            text: `${(P.shortDesc || {})[p.name] || p.desc} (${p.tags.join(', ')})`
          }))
        })));
      const lead = cats.findIndex((c) => c.category === variant.leadCategory);
      if (lead > 0) cats.unshift(cats.splice(lead, 1)[0]);

      const out = [{ kind: 'heading', text: 'Projects' }];
      cats.forEach((c) => {
        if (!c.items.length) return;
        out.push({ kind: 'subgroup', text: c.category.replace(/&/g, 'and') });
        out.push({ kind: 'linkbullets', items: c.items });
      });
      return out;
    },

    education: () => {
      const e = CV.education[0];
      return [
        { kind: 'heading', text: 'Education' },
        { kind: 'jobhead', title: e.degree, dates: e.gradYear || '', org: `${e.school} (${e.university}), ${e.location}` }
      ];
    }
  };

  const records = [{
    kind: 'header',
    name: CV.name,
    headline: variant.headline,
    contacts: contacts()
  }];
  variant.sections.forEach((key) => {
    if (!sections[key]) throw new Error(`Unknown section "${key}" in variant "${variantName}"`);
    records.push(...sections[key]());
  });

  return {
    records,
    fileBase: variant.file,
    datesEstimated: CV.dates.datesEstimated
  };
}

module.exports = { buildModel, plain, runs, HEADINGS };

if (require.main === module) {
  const { renderVariant } = require('./build-txt.js');
  process.stdout.write(renderVariant(process.argv[2] || 'master'));
}
