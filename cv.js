/* ------------------------------------------------------------------
   Maninder Singh — CV renderer
   Data lives in cv-data.js (loaded first) as the CV object; this file
   only renders it into the page. Editing the CV means editing
   cv-data.js, not this file.
------------------------------------------------------------------ */

/* ---------------------------- helpers ---------------------------- */

const el = (tag, cls, html) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html != null) node.innerHTML = html;
  return node;
};

const $ = (sel) => document.querySelector(sel);

const ICONS = {
  phone: '<path d="M4 3h3.2l1.4 3.6-2 1.4a11 11 0 0 0 5.4 5.4l1.4-2L17 12.8V16a1 1 0 0 1-1.1 1A13 13 0 0 1 3 4.1A1 1 0 0 1 4 3Z"/>',
  mail: '<path d="M2.5 5h15v10h-15z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 5.5 10 11l7-5.5" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  pin: '<path d="M10 2a5.5 5.5 0 0 0-5.5 5.5C4.5 12 10 18 10 18s5.5-6 5.5-10.5A5.5 5.5 0 0 0 10 2Zm0 7.6a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2Z"/>',
  link: '<path d="M8.6 11.4a3 3 0 0 0 4.24 0l2.5-2.5a3 3 0 0 0-4.24-4.24l-1.2 1.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M11.4 8.6a3 3 0 0 0-4.24 0l-2.5 2.5a3 3 0 0 0 4.24 4.24l1.2-1.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
};

const icon = (name) =>
  `<svg class="ico" viewBox="0 0 20 20" aria-hidden="true">${ICONS[name] || ''}</svg>`;

/* ---------------------------- render ----------------------------- */

function renderHeader() {
  $('#cv-name').textContent = CV.name;
  $('#cv-title').textContent = CV.title;
  $('#cv-updated').textContent = 'Updated ' + CV.updated;
  document.title = CV.name + ' — CV';

  const contact = $('#cv-contact');
  CV.contact.forEach((c) => {
    const item = el('li', 'contact-item');
    item.innerHTML = c.href
      ? `${icon(c.icon)}<a href="${c.href}">${c.value}</a>`
      : `${icon(c.icon)}<span>${c.value}</span>`;
    contact.appendChild(item);
  });

  const stats = $('#cv-stats');
  CV.stats.forEach((s) => {
    const box = el('div', 'stat');
    box.innerHTML = `<span class="stat-value">${s.value}</span><span class="stat-label">${s.label}</span>`;
    stats.appendChild(box);
  });
}

function renderSummary() {
  const box = $('#summary-body');
  CV.summary.forEach((p) => box.appendChild(el('p', null, p)));
}

function renderExpertise() {
  const list = $('#expertise-list');
  CV.expertise.forEach((line) => list.appendChild(el('li', null, line)));
}

function renderExperience() {
  const wrap = $('#experience-list');
  CV.experience.forEach((job) => {
    const item = el('article', 'job' + (job.current ? ' job-current' : ''));
    const points = job.points.map((p) => `<li>${p}</li>`).join('');
    item.innerHTML = `
      <div class="job-head">
        <h3 class="job-company">${job.company}</h3>
        <span class="job-period${job.current ? ' is-now' : ''}">${fmtRange(job)}</span>
      </div>
      <p class="job-meta">${job.role} · ${job.location}</p>
      <ul class="job-points">${points}</ul>`;
    wrap.appendChild(item);
  });
}

function renderEducation() {
  const wrap = $('#education-list');
  CV.education.forEach((e) => {
    const item = el('article', 'edu');
    item.innerHTML = `
      <h3 class="edu-degree">${e.degree}</h3>
      <p class="edu-school">${e.school} · ${e.location}</p>
      <p class="edu-extra">${e.university}${e.gradYear ? ' · ' + e.gradYear : ''}</p>`;
    wrap.appendChild(item);
  });
}

function renderSkills() {
  const wrap = $('#skills-grid');
  CV.skills.forEach((g) => {
    const item = el('div', 'skill-group');
    const tags = g.items.map((s) => `<li class="tag">${s}</li>`).join('');
    item.innerHTML = `<h3 class="skill-title">${g.group}</h3><ul class="tag-list">${tags}</ul>`;
    wrap.appendChild(item);
  });

  const lead = $('#leadership-list');
  CV.leadership.forEach((l) => lead.appendChild(el('li', 'tag tag-soft', l)));
}

let allProjectCards = [];

function renderProjects() {
  const wrap = $('#projects-body');

  CV.projects.forEach((cat) => {
    const block = el('div', 'proj-cat');
    block.dataset.category = cat.category;

    const head = el('h3', 'proj-cat-title');
    head.innerHTML = `${cat.category} <span class="proj-count">${cat.items.length}</span>`;
    block.appendChild(head);

    const grid = el('div', 'proj-grid');
    cat.items.forEach((p) => {
      const card = el('article', 'proj');
      const tags = p.tags.map((t) => `<li class="tag tag-mini">${t}</li>`).join('');
      const heading = p.url
        ? `<a class="proj-name" href="${p.url}" target="_blank" rel="noopener noreferrer">${p.name}<svg class="ico ico-out" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4h9v9h-2V7.4L8 13.4 6.6 12l6-6H7z"/><path d="M4 6h3v2H6v6h6v-1h2v3H4z"/></svg></a>`
        : `<span class="proj-name">${p.name}</span>`;
      card.innerHTML = `
        <h4 class="proj-head">${heading}</h4>
        <p class="proj-desc">${p.desc}</p>
        <ul class="tag-list">${tags}</ul>`;
      card.dataset.search = (p.name + ' ' + p.desc + ' ' + p.tags.join(' ') + ' ' + cat.category).toLowerCase();
      grid.appendChild(card);
      allProjectCards.push({ card, block });
    });

    block.appendChild(grid);
    wrap.appendChild(block);
  });

  const more = $('#more-list');
  CV.more.forEach((m) => more.appendChild(el('li', 'more-item', m)));
  $('#more-count').textContent = CV.more.length;
}

/* --------------------------- behaviour --------------------------- */

function initFilters() {
  const bar = $('#proj-filters');
  const categories = ['All'].concat(CV.projects.map((c) => c.category));

  categories.forEach((name, i) => {
    const btn = el('button', 'chip' + (i === 0 ? ' is-active' : ''), name);
    btn.type = 'button';
    btn.dataset.filter = name;
    bar.appendChild(btn);
  });

  const search = $('#proj-search');

  const apply = () => {
    const active = bar.querySelector('.chip.is-active').dataset.filter;
    const term = search.value.trim().toLowerCase();
    let shown = 0;

    allProjectCards.forEach(({ card, block }) => {
      const catOk = active === 'All' || block.dataset.category === active;
      const textOk = !term || card.dataset.search.includes(term);
      const visible = catOk && textOk;
      card.hidden = !visible;
      if (visible) shown++;
    });

    // hide a category block once every card inside it is filtered out
    document.querySelectorAll('.proj-cat').forEach((block) => {
      const any = block.querySelector('.proj:not([hidden])');
      block.hidden = !any;
    });

    const empty = $('#proj-empty');
    empty.hidden = shown > 0;
    $('#proj-shown').textContent = shown;
  };

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    bar.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-active'));
    btn.classList.add('is-active');
    apply();
  });

  search.addEventListener('input', apply);
  apply();
}

function initTheme() {
  const btn = $('#theme-toggle');
  const root = document.documentElement;

  const read = () => {
    try { return localStorage.getItem('cv-theme'); } catch (e) { return null; }
  };
  const save = (v) => {
    try { localStorage.setItem('cv-theme', v); } catch (e) { /* private mode */ }
  };

  const stored = read();
  if (stored === 'dark' || stored === 'light') root.setAttribute('data-theme', stored);

  const label = () => {
    const dark = root.getAttribute('data-theme') === 'dark' ||
      (!root.hasAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    btn.textContent = dark ? 'Light' : 'Dark';
  };

  btn.addEventListener('click', () => {
    const dark = root.getAttribute('data-theme') === 'dark' ||
      (!root.hasAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const next = dark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    save(next);
    label();
  });

  label();
}

function initNav() {
  const nav = $('#cv-nav');
  const sections = Array.from(document.querySelectorAll('main section[id]'));

  sections.forEach((s) => {
    const link = el('a', 'nav-link', s.dataset.nav || s.id);
    link.href = '#' + s.id;
    nav.appendChild(link);
  });

  const links = Array.from(nav.querySelectorAll('.nav-link'));

  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      links.forEach((l) => l.classList.toggle('is-active', l.hash === '#' + id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });

  sections.forEach((s) => observer.observe(s));
}

function initPrint() {
  $('#print-btn').addEventListener('click', () => {
    // print the full project list, not the filtered view
    const bar = $('#proj-filters');
    const all = bar.querySelector('[data-filter="All"]');
    if (all && !all.classList.contains('is-active')) all.click();
    const search = $('#proj-search');
    if (search.value) { search.value = ''; search.dispatchEvent(new Event('input')); }
    window.print();
  });
}

function initProgress() {
  const bar = $('#scroll-progress');
  const update = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

/* ----------------------------- boot ----------------------------- */

if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => {
  renderHeader();
  renderSummary();
  renderExpertise();
  renderExperience();
  renderEducation();
  renderSkills();
  renderProjects();
  initFilters();
  initTheme();
  initNav();
  initPrint();
  initProgress();
  $('#cv-year').textContent = new Date().getFullYear();
});
