/* ------------------------------------------------------------------
   Maninder Singh — CV data + renderer
   Everything on the page is generated from the CV object below,
   so editing the CV means editing data, not markup.
------------------------------------------------------------------ */

const CV = {
  name: 'Maninder Singh',
  title: 'Senior Software Engineer — Full Stack Web Developer',
  updated: '4 September 2026',
  contact: [
    { label: 'Phone', value: '(+91) 98728-52673', href: 'tel:+919872852673', icon: 'phone' },
    { label: 'Email', value: 'maninder6005@gmail.com', href: 'mailto:maninder6005@gmail.com', icon: 'mail' },
    { label: 'Location', value: 'Mohali, Punjab, India', href: null, icon: 'pin' }
  ],
  stats: [
    { value: '9+', label: 'Years experience' },
    { value: '80+', label: 'Sites delivered' },
    { value: '6', label: 'CMS / platforms' },
    { value: '3', label: 'Companies' }
  ],
  summary: [
    'Full Stack Web Developer and critical thinker with <strong>9+ years of experience</strong> building websites from scratch and delivering web applications end to end — from UI design and development through rigorous testing and long-term maintenance. Strong background in eCommerce, with deep hands-on experience in <strong>Shopware, Symfony, Laravel, WordPress, Joomla and Magento</strong>, and equally comfortable on the front end with <strong>React.js, Angular, Vue.js and TypeScript</strong>.',
    'Certified in PHP and fluent in HTML5, CSS3, JavaScript and jQuery. I identify software issues and debug code analytically, translate complex business requirements into scalable and performance-optimised software, and manage my time to hit tight startup deadlines. Experienced in both team and self-directed environments, with strong communication and client-facing skills.'
  ],
  expertise: [
    '9+ years as a professional PHP web developer with a consistent record of delivering production websites.',
    'Extensive experience developing and maintaining eCommerce sites on <strong>Shopware</strong>, including custom themes, plugins and modules; built several Shopware 6 storefronts from scratch.',
    'Back end development in <strong>PHP 8.0+, Symfony (2, 4, 5) and MySQL</strong>; front end in HTML, CSS, jQuery and modern JS frameworks.',
    'Redeveloped legacy systems into <strong>Symfony</strong> applications and <strong>microservices</strong>, including a multi-tenant Symfony 5 monolith and Angular 11 front ends.',
    'Built <strong>React.js</strong> interfaces for enterprise platforms using TypeScript, Redux / Redux-Saga, React Hooks, Material UI and Styled Components; created reusable component libraries and optimised components for performance across devices and browsers.',
    'Advanced knowledge of <strong>Doctrine ORM</strong> and the MVC pattern for enterprise applications.',
    'Responsible for installing, configuring and maintaining Symfony, PHP, Apache and MySQL on <strong>AWS</strong> cloud servers.',
    'Deep <strong>WordPress</strong> experience: custom theme development, paid theme customisation, plugin development, multisite tooling, back end architecture, database and server integration, and performance troubleshooting.',
    'Solid <strong>Joomla</strong> experience: component, template, module and plugin development, extension modification, site security, speed optimisation and ongoing maintenance; W3C-compliant, SEO-optimised, responsive front ends.',
    'Configured payment gateways including PayPal, Klarna, Payone, Stripe, Braintree and Authorize.net.',
    'Domain experience across <strong>jewellery, grocery, furniture, medicine/pharma, food, fashion, automotive warranty, HR/psychometrics and consulting</strong>.',
    'Agile Scrum practitioner — daily stand-ups, sprint reviews and release planning; code reviews, automated tests and quality assurance procedures.',
    'Regular direct client communication, requirement gathering and deployment to client expectations.'
  ],
  experience: [
    {
      company: 'Orione Solutions Pvt. LLC',
      role: 'Senior Software Engineer',
      location: 'Mohali, Punjab',
      period: 'Current',
      current: true,
      points: [
        'Senior engineer on Shopware 6 and Symfony eCommerce builds — custom themes, plugins and modules delivered from scratch.',
        'Front end work in React, TypeScript and Angular alongside PHP 8 / MySQL back end services.',
        'Client-facing delivery: requirement analysis, code review, automated tests and deployment.'
      ]
    },
    {
      company: 'Maven Softwares',
      role: 'Senior Software Developer',
      location: 'Mohali, Punjab',
      period: 'Previous',
      points: [
        'Rebuilt legacy platforms as Symfony applications and microservices with Angular and React front ends.',
        'Owned database design on MySQL and PostgreSQL, plus Doctrine ORM data layers.',
        'Mentored junior developers and managed task delegation across the team.'
      ]
    },
    {
      company: 'Vertex Info Solutions',
      role: 'Software Developer',
      location: 'Chandigarh',
      period: 'Previous',
      points: [
        'Built custom PHP, WordPress and Joomla websites end to end for UK, US, Canadian and Australian clients.',
        'Custom theme and plugin development, third-party API integrations and payment gateway setup.',
        'Handled hosting, SSL, DNS and ongoing site maintenance on LAMP stacks.'
      ]
    }
  ],
  education: [
    {
      degree: 'Bachelor of Science in Information & Technology',
      school: 'Doaba College, Jalandhar, Punjab',
      extra: 'Guru Nanak Dev University, Amritsar'
    }
  ],
  skills: [
    { group: 'Languages', items: ['PHP 8.0+', 'JavaScript (ES6+)', 'TypeScript', 'HTML5', 'CSS3', 'SQL', 'XML', 'JSON'] },
    { group: 'PHP frameworks', items: ['Symfony 2 / 4 / 5', 'Laravel', 'Zend', 'CodeIgniter', 'CakePHP'] },
    { group: 'eCommerce', items: ['Shopware 6', 'Magento', 'WooCommerce', 'Shopify', 'OpenCart', 'PrestaShop'] },
    { group: 'CMS', items: ['WordPress', 'Joomla'] },
    { group: 'Front end', items: ['React.js', 'Next.js', 'Redux / Redux-Saga', 'React Hooks', 'Angular 11', 'Vue.js', 'jQuery', 'Bootstrap', 'Material UI', 'Styled Components', 'Sass'] },
    { group: 'Back end / API', items: ['Node.js', 'Express', 'GraphQL', 'REST', 'SOAP', 'Doctrine ORM', 'MVC'] },
    { group: 'Databases', items: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB', 'Oracle', 'MS SQL Server'] },
    { group: 'Cloud & DevOps', items: ['AWS', 'Azure', 'Docker', 'Apache', 'IIS', 'LAMP / WAMP', 'SSL', 'DNS', 'SSH', 'CI/CD'] },
    { group: 'Payments', items: ['Stripe', 'PayPal', 'Klarna', 'Payone', 'Braintree', 'Authorize.net', 'K-Net', 'BeanStream'] },
    { group: 'Tooling & process', items: ['Git', 'GitHub', 'GitLab', 'Bitbucket', 'JIRA', 'Agile Scrum', 'Unit testing'] }
  ],
  leadership: [
    'Team leadership', 'Project management', 'Mentoring junior developers', 'Task delegation',
    'Client relations', 'Strategic planning', 'Problem solving', 'Communication & presentation'
  ],
  projects: [
    {
      category: 'Shopware & eCommerce',
      items: [
        { name: 'sassyclassy.de', url: 'https://sassyclassy.de', tags: ['Shopware', 'Fashion'], desc: 'Shopware-based fashion eCommerce site offering a wide range of clothing for browsing and purchase.' },
        { name: 'koffer-to-go.de', url: 'https://www.koffer-to-go.de/', tags: ['Shopware 6', 'Payments'], desc: 'Online bag store built on Shopware 6, focused on a user-friendly interface, product browsing, secure payments, shipping options and customer account management.' },
        { name: 'meentzen.de', url: 'https://meentzen.de/en/', tags: ['Shopware', 'From scratch'], desc: 'Fully responsive, modern Shopware site built from scratch, showcasing skincare and beauty products.' },
        { name: 'rbb-online-shop.de', url: 'https://www.rbb-online-shop.de/', tags: ['Shopware', 'Custom theme'], desc: 'Shopware store with a custom theme built to give a tailored shopping experience for a specific brand and product line.' },
        { name: 'frostkrone.de', url: 'https://frostkrone.de/', tags: ['Shopware', 'From scratch', 'Food'], desc: 'Comprehensive Shopware eCommerce platform built from scratch for a diverse selection of food products.' },
        { name: 'val-store.com', url: 'https://www.val-store.com/', tags: ['Shopware'], desc: 'Shopware-based eCommerce shop covering a broad product range.' }
      ]
    },
    {
      category: 'Symfony & Enterprise',
      items: [
        { name: 'schmetterling.de', url: 'https://schmetterling.de/', tags: ['Symfony', 'Angular 11', 'Microservices'], desc: 'Redeveloped microservices in Symfony with new components and an Angular 11 UI. Owned the Campaign Master, Notes Management and Newsletter Unsubscriptions services.' },
        { name: 'locumbay.com', url: 'https://www.locumbay.com/', tags: ['Symfony', 'MySQL'], desc: 'Rebuilt an existing booking platform in Symfony with new modules, UI and workflow. Pharmacies post jobs and locums apply for part-time or permanent work; includes full reporting, invoices, statements, verification, messaging and notifications.' },
        { name: 'local-brand-x.com', url: 'https://www.local-brand-x.com/', tags: ['Symfony 5', 'Multi-tenant'], desc: 'Multi-tenant Symfony 5 monolith with MySQL and several external services for additional functionality.' }
      ]
    },
    {
      category: 'React & TypeScript',
      items: [
        { name: 'MSXI — mWISE', url: 'https://www.msxi.com/en/mwise/', tags: ['React', 'TypeScript', 'Redux', 'Material UI'], desc: 'Warranty platform giving OEMs accuracy and transparency across importer audits and warranty assessments. Designed the security and queue pages, added search filters to the allocation, unallocated claims, roles and admin management tables, redesigned the profile page, wrote automated tests, and handled client communication and deployment.' },
        { name: 'XcooBee — Art of Living', url: 'https://app.xcoobee.net/auth/login', tags: ['React', 'Node.js', 'GraphQL', 'MongoDB', 'React Native'], desc: 'Privacy-policy network portal with multi-user chat, high-security data sharing, cookie and consent management, QR scanning, a payment wizard and subscription packages. Also delivered the WordPress site, custom plugins, a React Native / Redux / GraphQL mobile portal and Braintree payments, plus specs, test strategies and code reviews.' },
        { name: 'Heritage Olympiad', url: null, tags: ['React', 'Redux', 'API design'], desc: 'Platform integrating heritage education into Indian schools. Built the front end and mockup design, designed and developed all APIs, implemented Facebook and Google login/signup, the subscription module and payment integration, plus automated tests and deployment.' },
        { name: 'Talent Recognition', url: 'https://app.talent-recognition.com/', tags: ['React', 'Redux', 'Stripe', '.NET'], desc: 'Psychometric testing web app with admin and user roles. Implemented web-camera capture and PDF generation, Stripe payments, the partner onboarding process and React-Redux/Hooks state management; defined QA procedures and deployment.' },
        { name: 'Guild', url: 'https://www.guild.im/', tags: ['React', 'Bootstrap'], desc: 'Virtual consulting firm platform serving 8,000+ vetted independent consultants. Built the front end and design to client needs, created the resource and project-posting features, and worked across both sides of the application.' },
        { name: 'triceraprint.com', url: 'https://triceraprint.com/', tags: ['React'], desc: 'Print software tool built in React.' }
      ]
    },
    {
      category: 'WordPress',
      items: [
        { name: 'wpempirebuilder.com', url: 'http://wpempirebuilder.com/', tags: ['Plugin', 'Multisite'], desc: 'WordPress plugin making multisite trivial to run: one-click multisite setup, integrated domain mapping, automatic cPanel integration and bulk plugin/theme activation on selected child sites.' },
        { name: 'giladlab.uchicago.edu', url: 'https://giladlab.uchicago.edu/', tags: ['Custom build'], desc: 'Custom rebuild of a genetics department site for the University of Chicago.' },
        { name: 'nexcelom.com', url: 'https://www.nexcelom.com/', tags: ['Migration', 'SEO'], desc: 'Migrated a cellular-biology company from an outdated static HTML site to WordPress: hundreds of pages recreated, file transfer, 301 redirects, link monitoring, new forms and ongoing SEO work.' },
        { name: 'chronotek.net', url: 'https://www.chronotek.net/', tags: ['Theme'], desc: 'Built out an HTML-encoded WordPress website.' },
        { name: 'fabearseco.com', url: 'https://fabearseco.com/', tags: ['Theme', 'SEO'], desc: 'Replaced an old non-responsive site with a new WordPress build; SEO work took the client to the number-one position for many key phrases across multiple cities.' },
        { name: 'neviahomehub.com', url: 'https://neviahomehub.com/', tags: ['WooCommerce', 'Custom logic'], desc: 'Hygiene products store with custom offer-screen logic and an integrated blog section.' },
        { name: 'yorkvilla.in', url: null, tags: ['Extension', 'Cart'], desc: 'Shirt customiser tool letting customers change button, collar and cuff styles; built a custom extension integrated with the cart system.' },
        { name: 'porterandyork.com', url: 'https://porterandyork.com/', tags: ['WooCommerce', 'From scratch'], desc: 'WooCommerce store built from scratch.' },
        { name: 'bluestarcoffeeroasters.com', url: 'https://bluestarcoffeeroasters.com/', tags: ['WooCommerce'], desc: 'Coffee store developed in WooCommerce.' }
      ]
    },
    {
      category: 'Joomla',
      items: [
        { name: 'arrowservices.com', url: 'https://www.arrowservices.com/', tags: ['Joomla', 'Maintenance'], desc: 'Joomla CMS project covering design, development, management, maintenance, database and scripting.' },
        { name: 'exr.ca', url: 'http://exr.ca', tags: ['Joomla 1.5', 'Extension', 'Gantry'], desc: 'Full external and intranet deployments on Joomla 1.5: custom mooTree file navigation extension, a gallery component for the intranet, content construction kit selection, Gantry template customisation and a Google Maps location finder.' },
        { name: 'naturus.com', url: 'http://naturus.com', tags: ['Joomla', 'API integration', 'LMS'], desc: 'Consolidated static pages and disconnected dynamic pieces into a single Joomla codebase; full site deployment, customised subscription application, custom InfusionSoft and BeanStream payment API integrations tied to Joomla membership objects, plus learning management system configuration.' },
        { name: 'westcoastneurology.com', url: 'https://www.westcoastneurology.com/', tags: ['Joomla', 'Responsive', 'Upgrade'], desc: 'Upgraded the Joomla mobile-responsive template, framework and extensions, with ongoing maintenance.' },
        { name: 'sturgis.com', url: 'https://sturgis.com/', tags: ['Joomla'], desc: 'Developed and implemented Joomla back end features and front end designs.' },
        { name: 'ecftech.com.br', url: 'http://www.ecftech.com.br/', tags: ['Joomla'], desc: 'Company website developed on Joomla.' }
      ]
    },
    {
      category: 'Magento & Shopify',
      items: [
        { name: 'battingcagesusa.com', url: 'http://www.battingcagesusa.com/', tags: ['Magento'], desc: 'Magento online store for batting cages.' },
        { name: 'whatisblik.com', url: 'https://www.whatisblik.com/', tags: ['Shopify'], desc: 'Shopify eCommerce site for graphics products.' },
        { name: 'zinus.com', url: 'https://www.zinus.com/', tags: ['Shopify', 'Shogun'], desc: 'Shopify and Shogun online store for mattresses.' }
      ]
    },
    {
      category: 'Custom PHP & Business Sites',
      items: [
        { name: 'freelimitedcompany.com', url: 'https://www.freelimitedcompany.com/', tags: ['PHP', 'Payments'], desc: 'Checks company names for availability and, if free, walks users through registration and paid registration services.' },
        { name: 'moveyourvehicle.com', url: 'https://moveyourvehicle.com/', tags: ['PHP', 'Lead capture'], desc: 'Vehicle purchase enquiry platform capturing make, model, year, vehicle type, condition and full contact details, emailing the admin for deal follow-up.' },
        { name: 'theregisteredoffice.com', url: 'http://theregisteredoffice.com/', tags: ['PHP', 'Payments'], desc: 'Registered-office plans and packages with online ordering and payment.' },
        { name: 'nomineeservices.co.uk', url: 'http://nomineeservices.co.uk/', tags: ['PHP', 'Pricing plans'], desc: 'Nominee services offered across tiered pricing plans.' },
        { name: 'biotherapeuticsinc.com', url: 'https://biotherapeuticsinc.com/', tags: ['PHP', 'Pharma'], desc: 'Site for a pre-clinical company developing small-molecule drugs for autoimmune-related inflammation and type 2 diabetes; products, services, press and team sections.' },
        { name: 'supermannan.com', url: 'http://www.supermannan.com/', tags: ['PHP', 'eCommerce', 'Pharma'], desc: 'Urinary-tract-health supplement site with product and science pages, ingredient testing, ordering, blog and testimonials.' },
        { name: 'movingwithgrace.ca', url: 'http://movingwithgrace.ca/', tags: ['PHP', 'Forms'], desc: 'Moving-services site with an online estimate form of 150+ fields saved to the admin panel, service pages and claim procedures.' },
        { name: 'fidosplayground.ca', url: 'http://fidosplayground.ca/', tags: ['PHP', 'Booking'], desc: 'Dog-care site with daycare, pet shuttle, training and paid service pages, a four-tier rate card with registration, video content and a blog.' },
        { name: 'thought-bomb.net', url: 'http://thought-bomb.net/', tags: ['PHP', 'eCommerce'], desc: 'Art marketplace with category browsing, an artist submission workflow behind registration, product filtering, cart and checkout.' },
        { name: 'daniel-allen.net', url: 'http://www.daniel-allen.net/', tags: ['PHP', 'jQuery', 'Portfolio'], desc: 'Photography portfolio with a lightbox gallery, story pages, PDF story downloads, an integrated blog and a map-driven jQuery slider.' },
        { name: 'dxbwebsite.com', url: 'http://www.dxbwebsite.com/', tags: ['PHP', 'Corporate'], desc: 'Corporate site presenting the team, services, portfolio and blog.' }
      ]
    }
  ],
  more: [
    'evergenius.com', 'honestdoctor.com', 'totumwealth.com', 'spasublime.com.au', 'realadvisor.ch',
    'canberraprecincts.com.au', 'cccapitalgrp.com', 'healthvision.de', 'illuminarla.com', 'sassaia.com',
    'fvcre.com', 'elevate.ca', 'telugu360.com', 'wpraffle.com', 'vont.com', 'obomovement.org',
    'avosys.com', 'focusmx.com', 'valcompliance.com', 'alconexfire.com.au', 'oceanatm.com',
    'logixicf.com', 'essentialdesigns.net', 'casinobonuslister.com', 'casinobonusbeater.com',
    'allpokies.online', 'adconnector.com', 'blackrock-websolutions.de', 'ooe-gaertner.innpuls-secure.at',
    'pforadio.com', 'coasterpedicab.com', 'pedicaboutdoor.com', 'uniksy.com', 'thecorporatefilmguys.com',
    'thecorporateeventguys.com', 'mytlcteam.com', 'intuitiveip.com', 'ivyladder.com',
    'janaflamelesscandles.com', 'jacksmagic.com', 'eperfectsolutions.com'
  ]
};

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
  pin: '<path d="M10 2a5.5 5.5 0 0 0-5.5 5.5C4.5 12 10 18 10 18s5.5-6 5.5-10.5A5.5 5.5 0 0 0 10 2Zm0 7.6a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2Z"/>'
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
        <span class="job-period${job.current ? ' is-now' : ''}">${job.period}</span>
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
      <p class="edu-school">${e.school}</p>
      <p class="edu-extra">${e.extra}</p>`;
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

document.addEventListener('DOMContentLoaded', () => {
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
