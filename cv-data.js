/* ------------------------------------------------------------------
   Maninder Singh — CV data (single source of truth)

   This file holds DATA ONLY. The web page renderer lives in cv.js and
   the resume generators live in tools/. Both read this file, so the
   published page and the .docx files can never drift apart.

   Browser:  loaded via <script src="cv-data.js"> before cv.js
   Node:     require('./cv-data.js') -> { CV, fmtMonthYear, fmtRange }
------------------------------------------------------------------ */

/* Employment dates, from Maninder's LinkedIn profile (September 2026).
   Earlier non-developer roles (Computer Operator, VK Enterprises, 2011-12;
   Executive Assistant, Jaison Exports, 2012) are left off the resume.
   gradYear from Maninder (September 2026). */
const DATES = {
  datesEstimated: false,
  orionStart: '2017-02',
  mavenStart: '2015-10',
  mavenEnd: '2017-01',
  vertexStart: '2013-07',
  vertexEnd: '2015-09',
  gradYear: '2011',
  careerStart: '2013-07'
};

/* ---------------------------- date helpers ---------------------------- */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/* '2022-03' -> 'March 2022'; null/'' -> 'Present' */
function fmtMonthYear(ym) {
  if (!ym) return 'Present';
  const parts = String(ym).split('-');
  return MONTHS[Number(parts[1]) - 1] + ' ' + parts[0];
}

/* ASCII hyphen with spaces on both sides: every tokenizer splits on it,
   and unlike an en/em dash it never merges into one token. */
function fmtRange(job) {
  return fmtMonthYear(job.start) + ' - ' + fmtMonthYear(job.end);
}

/* Whole years elapsed since the career start, so the "11 years" claim in
   the summary can never go stale again. */
function yearsExperience(asOf) {
  const start = new Date(DATES.careerStart + '-01T00:00:00Z');
  const now = asOf ? new Date(asOf) : new Date();
  return Math.floor((now - start) / (365.2425 * 24 * 3600 * 1000));
}

const YEARS = yearsExperience();

/* Years shown on the resume. Vertex is hidden there (atsProfile.hideJobs), so
   the resume counts from Maven, the earliest job it lists: a checker that
   adds up the dated jobs gets the same number the summary states. Rounded to
   the nearest year, as checkers do. */
const ATS_YEARS = Math.round((new Date() - new Date(DATES.mavenStart + '-01T00:00:00Z')) / (365.2425 * 24 * 3600 * 1000));

/* ------------------------------------------------------------------ */

const CV = {
  name: 'Maninder Singh',

  /* Web hero title. The .docx uses atsTitle / atsVariants instead. */
  title: 'Senior Software Engineer — Full Stack Web Developer',

  /* Must stay EXACTLY equal to experience[0].role. Parsers cross-check the
     header title against the most recent job title; an exact match raises
     their confidence score. */
  atsTitle: 'Senior Software Engineer',

  /* Resume variants. Each sets the headline, the summary, an optional role
     line at the top of Technical Skills (coreSkills), which skills groups
     come first (skillOrder), which new projects lead (featured) and which
     project category comes first (leadCategory). The employer-attached job
     titles never change: a headline is positioning, a job entry is a claim. */
  atsVariants: {
    fullstack: {
      file: 'Maninder-Singh-Full-Stack-Developer',
      headline: 'Senior Full Stack Developer',
      summary: 'Senior Full Stack Developer with <strong>' + ATS_YEARS + ' years of experience</strong> building production web applications end to end: back ends in <strong>PHP 8, Laravel, Symfony and Node.js</strong>, front ends in <strong>React, Next.js, TypeScript and Angular</strong>. Delivers multi-tenant SaaS platforms, REST and GraphQL APIs, MEAN and MERN stack applications and Shopware 6 eCommerce for clients in Germany, the UK, the US, Canada and Australia. Currently building an AI voice-receptionist SaaS. Leads code reviews and mentors junior developers in Agile Scrum.',
      coreSkills: { group: 'Full Stack', items: ['PHP 8', 'Laravel', 'Symfony', 'Node.js', 'React.js', 'Next.js', 'Angular', 'TypeScript', 'MySQL', 'MongoDB', 'REST API', 'GraphQL'] },
      sections: ['summary', 'skills', 'experience', 'projects', 'education']
    },
    mean: {
      file: 'Maninder-Singh-MEAN-Stack-Developer',
      headline: 'Senior MEAN Stack Developer',
      summary: 'Senior MEAN Stack Developer with <strong>' + ATS_YEARS + ' years of experience</strong> building production web applications in <strong>MongoDB, Express.js, Angular and Node.js</strong> with TypeScript, plus PHP back ends in <strong>Laravel and Symfony</strong>. Built Angular platforms for healthcare provider credentialing and a 4-role retail survey system with an Ionic mobile app, Angular front ends for a multi-tenant flight and hotel booking platform, and REST and GraphQL APIs on Node.js. Works with clients in Germany, the UK, the US, Canada and Australia, leads code reviews and mentors junior developers.',
      coreSkills: { group: 'MEAN Stack', items: ['MongoDB', 'Express.js', 'Angular', 'Node.js', 'TypeScript', 'Ionic', 'REST API', 'GraphQL'] },
      skillOrder: ['Frontend', 'Backend Frameworks', 'Databases'],
      featured: ['providerpassport', 'mca', 'missional'],
      sections: ['summary', 'skills', 'experience', 'projects', 'education']
    },
    mern: {
      file: 'Maninder-Singh-MERN-Stack-Developer',
      headline: 'Senior MERN Stack Developer',
      summary: 'Senior MERN Stack Developer with <strong>' + ATS_YEARS + ' years of experience</strong> building production web applications in <strong>MongoDB, Express.js, React and Node.js</strong> with TypeScript, Next.js and Redux. Built React front ends for <strong>7 products</strong>, including an AI voice-receptionist SaaS and a consulting platform serving 8,000+ consultants, and a privacy and consent portal on Node.js, GraphQL and MongoDB with a React Native app. Also ships PHP back ends in Laravel and Symfony, and works with clients in Germany, the UK, the US, Canada and Australia.',
      coreSkills: { group: 'MERN Stack', items: ['MongoDB', 'Express.js', 'React.js', 'Node.js', 'Next.js', 'TypeScript', 'Redux', 'React Native', 'REST API', 'GraphQL'] },
      skillOrder: ['Frontend', 'Backend Frameworks', 'Databases'],
      featured: ['missional', 'providerpassport', 'mca'],
      leadCategory: 'React & TypeScript',
      sections: ['summary', 'skills', 'experience', 'projects', 'education']
    },
    shopware: {
      file: 'Maninder-Singh-Shopware-Developer',
      headline: 'Senior Shopware Developer | eCommerce Engineer',
      summary: 'Senior Shopware Developer with <strong>' + ATS_YEARS + ' years of experience</strong> in PHP eCommerce. Delivered <strong>6 Shopware 6 storefronts</strong> for German and EU retailers, 2 built from scratch, with custom plugins, Twig storefront themes, Administration extensions and <strong>Klarna, Payone and PayPal</strong> checkout. Strong in <strong>Symfony, PHP 8 and MySQL</strong>, including Laminas microservices and multi-tenant Symfony platforms, with React and Angular front ends. Works directly with clients from requirements to release in Agile Scrum and mentors junior developers.',
      coreSkills: { group: 'Shopware', items: ['Shopware 6', 'Shopware Plugins', 'Twig', 'Symfony', 'PHP 8', 'Doctrine ORM', 'MySQL', 'Klarna', 'Payone', 'PayPal'] },
      skillOrder: ['Ecommerce and CMS', 'Backend Frameworks', 'Payments'],
      leadCategory: 'Shopware & eCommerce',
      sections: ['summary', 'skills', 'experience', 'projects', 'education']
    },
    seniordev: {
      file: 'Maninder-Singh-Senior-Software-Developer',
      headline: 'Senior Software Developer | PHP, Laravel, Symfony',
      summary: 'Senior Software Developer with <strong>' + ATS_YEARS + ' years of experience</strong> building production web applications in <strong>PHP 8, Laravel and Symfony</strong>, with modern front ends in <strong>React.js, TypeScript and Angular</strong>. Specializes in <strong>Shopware 6 eCommerce</strong>, Symfony microservices and multi-tenant platforms for clients in Germany, the UK, the US, Canada and Australia. Currently building an AI voice-receptionist SaaS with React 19 and VAPI. Mentors junior developers and owns client delivery from requirements to release in Agile Scrum.',
      sections: ['summary', 'skills', 'experience', 'projects', 'education']
    }
  },


  updated: '5 September 2026',

  /* `ats` overrides `value` in the .docx. Parentheses around a country code
     are the single most common phone-parse failure, so the docx gets the
     plain form while the web keeps the readable one. */
  contact: [
    { label: 'Phone', value: '(+91) 98728-52673', ats: '+91 98728 52673', href: 'tel:+919872852673', icon: 'phone' },
    { label: 'Email', value: 'maninder6005@gmail.com', href: 'mailto:maninder6005@gmail.com', icon: 'mail' },
    { label: 'Location', value: 'Mohali, Punjab, India', ats: 'Mohali, Punjab, India', href: null, icon: 'pin' },
    { label: 'LinkedIn', value: 'linkedin.com/in/maninder0000', href: 'https://www.linkedin.com/in/maninder0000/', icon: 'link' },
    { label: 'GitHub', value: 'github.com/maninder-dev', href: 'https://github.com/maninder-dev', icon: 'link' },
    { label: 'Portfolio', value: 'maninder-dev.github.io', href: 'https://maninder-dev.github.io/', icon: 'link' }
  ],

  /* Web only. Never emitted to the .docx: four value/label pairs are either a
     table (banned) or a run-together blob like "11Years experience80+Sites". */
  stats: [
    { value: YEARS + '', label: 'Years experience' },
    { value: '80+', label: 'Sites delivered' },
    { value: '6', label: 'CMS / platforms' },
    { value: '3', label: 'Companies' }
  ],

  /* Resume summary: one short paragraph, since resume checkers flag long
     summaries. The web page keeps the longer three-paragraph `summary`. */
  atsSummary: 'Senior Software Engineer with <strong>' + ATS_YEARS + ' years of experience</strong> building production web applications in <strong>PHP 8, Laravel and Symfony</strong>, with modern front ends in <strong>React.js, TypeScript and Angular</strong>. Specializes in <strong>Shopware 6 eCommerce</strong>, Symfony microservices and multi-tenant platforms for clients in Germany, the UK, the US, Canada and Australia. Currently building an AI voice-receptionist SaaS with React 19 and VAPI. Mentors junior developers and owns client delivery from requirements to release in Agile Scrum.',

  /* <strong> renders bold on the web AND as bold runs in the .docx; the .txt
     strips it. Three paragraphs, matching the reference layout. */
  summary: [
    'Senior Software Engineer with <strong>' + YEARS + ' years of experience</strong> designing, building and maintaining production web applications end to end, from back-end architecture and APIs through UI, testing, deployment and long-term support. Strong expertise in <strong>PHP 8, Laravel and Symfony</strong>, with a record of delivering eCommerce platforms, enterprise portals and multi-tenant systems for clients in Germany, the UK, the US, Canada and Australia.',
    'Specializes in <strong>Shopware eCommerce</strong>: storefronts built from scratch, custom Twig themes, Administration plugins and Symfony-based modules, with checkout integrations for <strong>PayPal, Klarna and Payone</strong>. Experienced in re-platforming legacy systems into <strong>Symfony microservices</strong> and multi-tenant Symfony 5 applications backed by Doctrine ORM and MySQL.',
    'Builds modern front ends in <strong>React.js, TypeScript and Angular</strong> (Redux, Redux-Saga, React Hooks, Material UI) integrated with REST and GraphQL APIs. Works directly with clients on requirements, estimation, <strong>code review</strong>, automated testing and release in Agile Scrum teams, and mentors junior developers. Currently building an <strong>AI voice-receptionist SaaS</strong> with React 19 and VAPI voice AI.'
  ],

  /* Web only. Cut from the .docx: it duplicates the summary and skills, and it
     is where the unbacked claims concentrate. Content redistributed into the
     summary, the skills groups and the job bullets. */
  expertise: [
    YEARS + ' years as a professional PHP web developer with a consistent record of delivering production websites.',
    'Extensive experience developing and maintaining eCommerce sites on <strong>Shopware</strong>, including custom themes, plugins and modules.',
    'Back end development in <strong>PHP 8.0+, Symfony and MySQL</strong>; front end in HTML, CSS, jQuery and modern JS frameworks.',
    'Redeveloped legacy systems into <strong>Symfony</strong> applications and <strong>microservices</strong>, including a multi-tenant Symfony 5 platform and Angular front ends.',
    'Built <strong>React.js</strong> interfaces for enterprise platforms using TypeScript, Redux / Redux-Saga, React Hooks and Material UI; created reusable component libraries and optimized components for performance across devices and browsers.',
    'Advanced knowledge of <strong>Doctrine ORM</strong> and the MVC pattern for enterprise applications.',
    'Deep <strong>WordPress</strong> experience: custom theme development, paid theme customization, plugin development, multisite tooling, back end architecture, database and server integration, and performance troubleshooting.',
    'Solid <strong>Joomla</strong> experience: component, template, module and plugin development, extension modification, site security, speed optimization and ongoing maintenance; W3C-compliant, SEO-optimized, responsive front ends.',
    'Configured payment gateways including PayPal, Klarna, Payone, Stripe, Braintree and Authorize.net.',
    'Domain experience across <strong>jewellery, grocery, furniture, medicine and pharma, food, fashion, automotive warranty, HR and psychometrics, and consulting</strong>.',
    'Agile Scrum practitioner: daily stand-ups, sprint reviews and release planning; code reviews, automated tests and quality assurance procedures.',
    'Regular direct client communication, requirement gathering and deployment to client expectations.'
  ],

  /* ----------------------------------------------------------------
     EXPERIENCE

     The 9 bullets that used to be here were INFERRED in an earlier
     session and appear in no source CV. These replacements are drawn
     from the corpus, with the 12 strongest projects folded in — a
     project attached to an employer, a date and a verb is strong
     evidence; the same project floating in a list is weak evidence.

     No figure here is invented. The source CVs contain almost no
     metrics (team size, traffic, % improvements) — adding real ones
     from memory is the single biggest upgrade still available.

     Dates come from LinkedIn. Which projects sit under which employer is
     still inferred from the dates: everything built on Symfony 5 (2019),
     Laminas (2020), React Hooks (2019) or Shopware 6 (2019) postdates
     Maven (Oct 2015 - Jan 2017), so it all belongs to Orion eSolutions.
     ---------------------------------------------------------------- */
  /* atsPoints = the short resume bullets; points = the full list (web page). */
  experience: [
    {
      company: 'Orion eSolutions, LLC',
      role: 'Senior Software Engineer',
      location: 'Mohali, Punjab, India',
      start: DATES.orionStart,
      end: null,
      current: true,
      atsPoints: [
        'Delivered <strong>6 Shopware 6 storefronts</strong> for German and EU retailers, <strong>2 built from scratch</strong>, with custom plugins, Twig themes and Klarna, Payone and PayPal checkout.',
        'Built <strong>3 Symfony platforms</strong> (2 multi-tenant), including Laminas microservices for a flight and hotel booking system and a UK healthcare staffing marketplace, plus Laravel back ends.',
        'Built <strong>React and TypeScript</strong> front ends for <strong>7 products</strong>, including a consulting platform serving <strong>8,000+ consultants</strong> and an AI voice-receptionist SaaS.',
        'Develop <strong>MEAN and MERN stack</strong> apps (MongoDB, Express.js, Angular, React, Node.js) with REST and GraphQL APIs, including a <strong>4-role</strong> Angular and Ionic survey platform.',
        'Lead code reviews and client delivery in Agile Scrum for clients in <strong>5 countries</strong>, and mentor junior developers.'
      ],
      points: [
        'Build features for <strong>MissionalAgents</strong>, a multi-tenant AI phone-receptionist SaaS for churches, with a <strong>React 19</strong> front end and VAPI voice AI.',
        'Build and maintain <strong>Shopware 6</strong> eCommerce storefronts for German and EU retail clients, including stores built from scratch, custom <strong>Twig</strong> storefront themes, Administration plugins and Symfony-based modules, with <strong>PayPal, Klarna and Payone</strong> checkout integrations.',
        'Built <strong>Laminas microservices</strong> for Schmetterling, a multi-tenant flight and hotel booking platform on <strong>Symfony and PostgreSQL</strong>, with <strong>Angular</strong> front ends.',
        'Rebuilt a UK healthcare staffing marketplace in <strong>Symfony and MySQL</strong> (job posting, locum verification, messaging, invoicing and reporting) and delivered a <strong>multi-tenant Symfony 5</strong> platform for a retail client.',
        'Built enterprise interfaces in <strong>React and TypeScript</strong> with Redux, Redux-Saga, React Hooks and Material UI for MSX International, and a privacy and consent portal on <strong>Node.js, GraphQL and MongoDB</strong> with a React Native app.',
        'Shipped platforms with <strong>Stripe and Braintree</strong> payments, Facebook and Google OAuth and subscription modules, and developed back-end services in <strong>PHP 8, Symfony and Laravel</strong> exposing REST APIs.',
        'Own client-facing delivery end to end (requirements, estimation, <strong>code review</strong>, automated tests and release in Agile Scrum) and mentor junior developers.'
      ]
    },
    {
      company: 'Maven Softwares',
      role: 'Senior Software Developer',
      location: 'Mohali, Punjab, India',
      start: DATES.mavenStart,
      end: DATES.mavenEnd,
      atsPoints: [
        'Built <strong>Laravel</strong> web applications and REST APIs for clients in <strong>4 countries</strong> (UK, US, Canada, Australia).',
        'Developed custom <strong>WordPress</strong> themes, plugins and WooCommerce stores, and migrated a life-sciences site of <strong>several hundred pages</strong> from static HTML with mapped 301 redirects.',
        'Built a WordPress <strong>multisite management plugin</strong> (wpempirebuilder.com) with one-click setup, domain mapping, cPanel integration and bulk theme and plugin activation.'
      ],
      points: [
        'Delivered custom <strong>PHP, WordPress, WooCommerce and Magento</strong> sites end to end for clients in the UK, the US, Canada and Australia.',
        'Migrated a life-sciences company from static HTML to <strong>WordPress</strong>, recreating <strong>several hundred pages</strong> with mapped 301 redirects, link monitoring and new lead-capture forms.',
        'Built a WordPress <strong>multisite management plugin</strong> with one-click setup, domain mapping, cPanel integration and bulk theme and plugin activation.'
      ]
    },
    {
      company: 'Vertex Info Solutions',
      role: 'Software Developer',
      location: 'Chandigarh, India',
      start: DATES.vertexStart,
      end: DATES.vertexEnd,
      atsPoints: [
        'Built custom <strong>core PHP</strong> and MySQL applications with payment gateway integrations, including an online estimate form of <strong>150+ fields</strong> with an admin workflow.',
        'Developed <strong>WordPress</strong> sites with custom themes and plugins for client projects.'
      ],
      points: [
        'Led external and intranet deployments on <strong>Joomla</strong> from planning through launch and post-deployment support, building custom extensions, components and template customizations.',
        'Built custom <strong>PHP</strong> business sites, including a <strong>150+ field</strong> online estimate form with admin-side workflow.',
        'Integrated payment gateways (Authorize.net, PayPal, InfusionSoft, BeanStream) and managed LAMP hosting, SSL and DNS.'
      ]
    }
  ],

  /* 'Information Technology' without the ampersand: degree dictionaries
     contain that exact string, and the '&' blocks the lookup. The affiliating
     university sits in parentheses on the SAME line — the old version used a
     <w:br/>, which made naive extractors emit the token 'PunjabGuru'. */
  education: [
    {
      degree: 'Bachelor of Science in Information Technology',
      school: 'Doaba College',
      university: 'Guru Nanak Dev University',
      location: 'Jalandhar, Punjab, India',
      gradYear: DATES.gradYear
    }
  ],

  /* Comma-delimited in the .docx as 'Label: a, b, c' paragraphs — never a
     table, and never a middot. 'Also worked with' is the honest tail: it keeps
     the keywords while making clear which have no project behind them, so an
     LLM asked "does he have Docker experience?" is not misled by a flat list. */
  skills: [
    { group: 'Core Languages', items: ['PHP 8', 'Java', 'JavaScript (ES6+)', 'TypeScript', 'SQL', 'HTML5', 'CSS3'] },
    { group: 'Backend Frameworks', items: ['Symfony', 'Symfony 5', 'Laravel', 'Laminas', 'Java Spring', 'Doctrine ORM', 'Node.js', 'Express.js', 'NestJS', 'MEAN Stack', 'MERN Stack', 'REST API', 'GraphQL', 'Microservices'] },
    { group: 'AI and Voice', items: ['VAPI Voice AI', 'Bolna', 'LiveKit', 'AI Call Classification', 'Twilio Lookup', 'Nomorobo'] },
    { group: 'Frontend', items: ['React.js', 'ReactJS', 'React 19', 'Next.js', 'Vite', 'Angular', 'Ionic', 'Redux', 'Redux-Saga', 'React Hooks', 'Material UI', 'jQuery', 'Bootstrap', 'Sass'] },
    { group: 'Ecommerce and CMS', items: ['Shopware 6', 'Shopware', 'Twig', 'Magento', 'WooCommerce', 'Shopify', 'WordPress', 'Joomla'] },
    { group: 'Databases', items: ['MySQL', 'MariaDB', 'MongoDB', 'PostgreSQL', 'Vector Database'] },
    { group: 'Cloud and DevOps', items: ['AWS (Amazon Web Services)', 'Apache', 'LAMP', 'Git', 'GitHub', 'GitLab', 'Bitbucket', 'SSL', 'DNS'] },
    { group: 'Payments', items: ['Stripe', 'PayPal', 'Klarna', 'Payone', 'Braintree', 'QuickPay', 'Authorize.net', 'BeanStream'] },
    { group: 'Practices', items: ['Agile', 'Scrum', 'JIRA', 'Code Review', 'Unit Testing', 'Mentoring', 'Client Communication'] },
    { group: 'Also worked with', items: ['Vue.js', 'Docker', 'CI/CD (Continuous Integration and Continuous Delivery)', 'Microsoft Azure', 'PrestaShop', 'OpenCart'] }
  ],

  /* Emitted to the .docx as one 'Leadership: ...' skills line, not as its own
     section — the old 'Management & leadership' heading is not in any parser's
     heading dictionary, so its content was being absorbed by the section above. */
  leadership: [
    'Team Leadership', 'Project Management', 'Mentoring', 'Task Delegation',
    'Client Relations', 'Strategic Planning', 'Problem Solving', 'Communication'
  ],

  /* `featured: true` selects the .docx set. The web page still shows all 44 —
     pruning by flag rather than by deleting `desc` keeps the site's search
     index intact (cv.js builds data-search from name + desc + tags + category). */
  projects: [
    {
      category: 'Shopware & eCommerce',
      items: [
        { name: 'koffer-to-go.de', url: 'https://www.koffer-to-go.de/', featured: true, atsTech: 'Shopware 6', atsDesc: 'luggage and travel-goods storefront with catalog browsing, secure payments, shipping options and customer account management', tags: ['Shopware 6', 'Payments'], desc: 'Online bag store built on Shopware 6, focused on a user-friendly interface, product browsing, secure payments, shipping options and customer account management.' },
        { name: 'frostkrone.de', url: 'https://frostkrone.de/', featured: true, atsTech: 'Shopware, built from scratch', atsDesc: 'frozen-food manufacturer storefront with a broad multi-category catalog', tags: ['Shopware', 'From scratch', 'Food'], desc: 'Comprehensive Shopware eCommerce platform built from scratch for a diverse selection of food products.' },
        { name: 'meentzen.de', url: 'https://meentzen.de/en/', featured: true, atsTech: 'Shopware, built from scratch', atsDesc: 'fully responsive skincare and beauty storefront', tags: ['Shopware', 'From scratch'], desc: 'Fully responsive, modern Shopware site built from scratch, showcasing skincare and beauty products.' },
        { name: 'rbb-online-shop.de', url: 'https://www.rbb-online-shop.de/', featured: true, atsTech: 'Shopware, custom theme', atsDesc: 'brand storefront with a bespoke theme and tailored product presentation', tags: ['Shopware', 'Custom theme'], desc: 'Shopware store with a custom theme built to give a tailored shopping experience for a specific brand and product line.' },
        { name: 'sassyclassy.de', url: 'https://sassyclassy.de', featured: true, atsTech: 'Shopware', atsDesc: 'fashion and apparel storefront', tags: ['Shopware', 'Fashion'], desc: 'Shopware-based fashion eCommerce site offering a wide range of clothing for browsing and purchase.' },
        { name: 'val-store.com', url: 'https://www.val-store.com/', featured: true, atsTech: 'Shopware', atsDesc: 'multi-category retail storefront', tags: ['Shopware'], desc: 'Shopware-based eCommerce shop covering a broad product range.' }
      ]
    },
    {
      category: 'Symfony & Enterprise',
      items: [
        { name: 'schmetterling.de', url: 'https://schmetterling.de/', tags: ['Symfony', 'Laminas', 'PostgreSQL', 'Microservices', 'Multi-tenant'], desc: 'Multi-tenant airline and hotel booking platform on Symfony and PostgreSQL. Built the Laminas microservices, new Symfony components and an Angular UI; owned the Campaign Master, Notes Management and Newsletter Unsubscriptions services.' },
        { name: 'locumbay.com', url: 'https://www.locumbay.com/', tags: ['Symfony', 'MySQL'], desc: 'Rebuilt an existing booking platform in Symfony with new modules, UI and workflow. Pharmacies post jobs and locums apply for part-time or permanent work; includes full reporting, invoices, statements, verification, messaging and notifications.' },
        { name: 'local-brand-x.com', url: 'https://www.local-brand-x.com/', tags: ['Symfony 5', 'Multi-tenant'], desc: 'Multi-tenant Symfony 5 platform with MySQL and several external services for additional functionality.' }
      ]
    },
    {
      category: 'React & TypeScript',
      items: [
        { name: 'MSXI mWISE', url: 'https://www.msxi.com/en/mwise/', tags: ['React', 'TypeScript', 'Redux', 'Material UI'], desc: 'Warranty platform giving OEMs accuracy and transparency across importer audits and warranty assessments. Designed the security and queue pages, added search filters to the allocation, unallocated claims, roles and admin management tables, redesigned the profile page, wrote automated tests, and handled client communication and deployment.' },
        { name: 'XcooBee (Art of Living)', url: 'https://app.xcoobee.net/auth/login', tags: ['React', 'Node.js', 'GraphQL', 'MongoDB', 'React Native'], desc: 'Privacy-policy network portal with multi-user chat, high-security data sharing, cookie and consent management, QR scanning, a payment wizard and subscription packages. Also delivered the WordPress site, custom plugins, a React Native / Redux / GraphQL mobile portal and Braintree payments, plus specs, test strategies and code reviews.' },
        { name: 'Heritage Olympiad', url: null, tags: ['React', 'Redux', 'API design'], desc: 'Platform integrating heritage education into Indian schools. Built the front end and mockup design, designed and developed all APIs, implemented Facebook and Google login/signup, the subscription module and payment integration, plus automated tests and deployment.' },
        { name: 'Talent Recognition', url: 'https://app.talent-recognition.com/', tags: ['React', 'Redux', 'Stripe'], desc: 'Psychometric testing web app with admin and user roles. Implemented web-camera capture and PDF generation, Stripe payments, the partner onboarding process and React-Redux/Hooks state management; defined QA procedures and deployment.' },
        { name: 'Guild', url: 'https://www.guild.im/', tags: ['React', 'Bootstrap'], desc: 'Virtual consulting firm platform for a client-reported network of 8,000+ vetted independent consultants. Built the front end and design to client needs, created the resource and project-posting features, and worked across both sides of the application.' },
        { name: 'triceraprint.com', url: 'https://triceraprint.com/', tags: ['React'], desc: 'Print software tool built in React.' }
      ]
    },
    {
      category: 'WordPress',
      items: [
        { name: 'wpempirebuilder.com', url: 'https://wpempirebuilder.com/', tags: ['Plugin', 'Multisite'], desc: 'WordPress plugin making multisite trivial to run: one-click multisite setup, integrated domain mapping, automatic cPanel integration and bulk plugin/theme activation on selected child sites.' },
        { name: 'giladlab.uchicago.edu', url: 'https://giladlab.uchicago.edu/', tags: ['Custom build'], desc: 'Custom rebuild of a genetics department site for the University of Chicago.' },
        { name: 'nexcelom.com', url: 'https://www.nexcelom.com/', tags: ['Migration', 'SEO'], desc: 'Migrated a cellular-biology company from an outdated static HTML site to WordPress: several hundred pages recreated, file transfer, mapped 301 redirects, link monitoring, new forms and ongoing SEO work.' },
        { name: 'chronotek.net', url: 'https://www.chronotek.net/', tags: ['Theme'], desc: 'Built out an HTML-encoded WordPress website.' },
        { name: 'fabearseco.com', url: 'https://fabearseco.com/', tags: ['Theme', 'SEO'], desc: 'Replaced an old non-responsive site with a new WordPress build; client-reported first-place rankings for many key phrases across multiple cities followed the SEO work.' },
        { name: 'neviahomehub.com', url: 'https://neviahomehub.com/', tags: ['WooCommerce', 'Custom logic'], desc: 'Hygiene products store with custom offer-screen logic and an integrated blog section.' },
        { name: 'yorkvilla.in', url: null, tags: ['Extension', 'Cart'], desc: 'Shirt customiser tool letting customers change button, collar and cuff styles; built a custom extension integrated with the cart system.' },
        { name: 'porterandyork.com', url: 'https://porterandyork.com/', tags: ['WooCommerce', 'From scratch'], desc: 'WooCommerce store built from scratch.' },
        { name: 'bluestarcoffeeroasters.com', url: 'https://bluestarcoffeeroasters.com/', tags: ['WooCommerce'], desc: 'Coffee store developed in WooCommerce.' }
      ]
    },
    {
      category: 'Joomla',
      items: [
        { name: 'exr.ca', url: 'https://exr.ca', tags: ['Joomla', 'Extension', 'Gantry'], desc: 'Full external and intranet deployments on Joomla: custom mooTree file navigation extension, a gallery component for the intranet, content construction kit selection, Gantry template customization and a Google Maps location finder.' },
        { name: 'naturus.com', url: 'https://naturus.com', tags: ['Joomla', 'API integration', 'LMS'], desc: 'Consolidated static pages and disconnected dynamic pieces into a single Joomla codebase; full site deployment, customised subscription application, custom InfusionSoft and BeanStream payment API integrations tied to Joomla membership objects, plus learning management system configuration.' },
        { name: 'arrowservices.com', url: 'https://www.arrowservices.com/', tags: ['Joomla', 'Maintenance'], desc: 'Joomla CMS project covering design, development, management, maintenance, database and scripting.' },
        { name: 'westcoastneurology.com', url: 'https://www.westcoastneurology.com/', tags: ['Joomla', 'Responsive', 'Upgrade'], desc: 'Upgraded the Joomla mobile-responsive template, framework and extensions, with ongoing maintenance.' },
        { name: 'sturgis.com', url: 'https://sturgis.com/', tags: ['Joomla'], desc: 'Developed and implemented Joomla back end features and front end designs.' },
        { name: 'ecftech.com.br', url: 'https://www.ecftech.com.br/', tags: ['Joomla'], desc: 'Company website developed on Joomla.' }
      ]
    },
    {
      category: 'Magento & Shopify',
      items: [
        { name: 'battingcagesusa.com', url: 'https://www.battingcagesusa.com/', tags: ['Magento'], desc: 'Magento online store for batting cages.' },
        { name: 'whatisblik.com', url: 'https://www.whatisblik.com/', tags: ['Shopify'], desc: 'Shopify eCommerce site for graphics products.' },
        { name: 'zinus.com', url: 'https://www.zinus.com/', tags: ['Shopify', 'Shogun'], desc: 'Shopify and Shogun online store for mattresses.' }
      ]
    },
    {
      category: 'Custom PHP & Business Sites',
      items: [
        { name: 'movingwithgrace.ca', url: 'https://movingwithgrace.ca/', tags: ['PHP', 'Forms'], desc: 'Moving-services site with an online estimate form of 150+ fields saved to the admin panel, service pages and claim procedures.' },
        { name: 'freelimitedcompany.com', url: 'https://www.freelimitedcompany.com/', tags: ['PHP', 'Payments'], desc: 'Checks company names for availability and, if free, walks users through registration and paid registration services.' },
        { name: 'moveyourvehicle.com', url: 'https://moveyourvehicle.com/', tags: ['PHP', 'Lead capture'], desc: 'Vehicle purchase enquiry platform capturing make, model, year, vehicle type, condition and full contact details, emailing the admin for deal follow-up.' },
        { name: 'theregisteredoffice.com', url: 'https://theregisteredoffice.com/', tags: ['PHP', 'Payments'], desc: 'Registered-office plans and packages with online ordering and payment.' },
        { name: 'nomineeservices.co.uk', url: 'https://nomineeservices.co.uk/', tags: ['PHP', 'Pricing plans'], desc: 'Nominee services offered across tiered pricing plans.' },
        { name: 'biotherapeuticsinc.com', url: 'https://biotherapeuticsinc.com/', tags: ['PHP', 'Pharma'], desc: 'Site for a pre-clinical company developing small-molecule drugs for autoimmune-related inflammation and type 2 diabetes; products, services, press and team sections.' },
        { name: 'supermannan.com', url: 'https://www.supermannan.com/', tags: ['PHP', 'eCommerce', 'Pharma'], desc: 'Urinary-tract-health supplement site with product and science pages, ingredient testing, ordering, blog and testimonials.' },
        { name: 'fidosplayground.ca', url: 'https://fidosplayground.ca/', tags: ['PHP', 'Booking'], desc: 'Dog-care site with daycare, pet shuttle, training and paid service pages, a four-tier rate card with registration, video content and a blog.' },
        { name: 'thought-bomb.net', url: 'https://thought-bomb.net/', tags: ['PHP', 'eCommerce'], desc: 'Art marketplace with category browsing, an artist submission workflow behind registration, product filtering, cart and checkout.' },
        { name: 'daniel-allen.net', url: 'https://www.daniel-allen.net/', tags: ['PHP', 'jQuery', 'Portfolio'], desc: 'Photography portfolio with a lightbox gallery, story pages, PDF story downloads, an integrated blog and a map-driven jQuery slider.' },
        { name: 'dxbwebsite.com', url: 'https://www.dxbwebsite.com/', tags: ['PHP', 'Corporate'], desc: 'Corporate site presenting the team, services, portfolio and blog.' }
      ]
    }
  ],

  /* Every other site from the source CVs, kept at Maninder's request. Printed
     on the resume as one comma-separated 'Other websites delivered' line. */
  more: [
    'evergenius.com', 'honestdoctor.com', 'totumwealth.com', 'spasublime.com.au', 'realadvisor.ch',
    'canberraprecincts.com.au', 'cccapitalgrp.com', 'healthvision.de', 'illuminarla.com', 'sassaia.com',
    'fvcre.com', 'elevate.ca', 'telugu360.com', 'wpraffle.com', 'vont.com', 'obomovement.org',
    'avosys.com', 'focusmx.com', 'valcompliance.com', 'alconexfire.com.au', 'oceanatm.com',
    'logixicf.com', 'essentialdesigns.net', 'casinobonuslister.com', 'casinobonusbeater.com',
    'allpokies.online', 'adconnector.com', 'blackrock-websolutions.de',
    'ooe-gaertner.innpuls-secure.at', 'pforadio.com', 'coasterpedicab.com', 'pedicaboutdoor.com',
    'uniksy.com', 'thecorporatefilmguys.com', 'thecorporateeventguys.com', 'mytlcteam.com',
    'intuitiveip.com', 'ivyladder.com', 'janaflamelesscandles.com', 'jacksmagic.com',
    'eperfectsolutions.com'
  ],

  /* Decisions the .docx needs and the web page does not. */
  atsProfile: {
    targetPages: 5,
    wordBudget: 3200,
    portfolioLine: 'More work: 80+ websites and applications delivered across WordPress, Joomla, WooCommerce, Magento, Shopify and custom PHP. Full portfolio:',
    portfolioUrl: 'https://maninder-dev.github.io/',
    /* Newest projects, listed first under Projects as their own category. */
    featuredCategory: 'SaaS and Enterprise Platforms',
    featured: ['missional', 'providerpassport', 'mca'],
    /* Jobs left off the resume (still on the web page). */
    hideJobs: ['Vertex Info Solutions'],
    /* Project categories left off the resume (still on the web page). */
    hideCategories: ['Joomla', 'Custom PHP & Business Sites'],
    /* Sites checked on 30 September 2026 that no longer exist (no DNS, 404,
       502, parked, for sale, or now a different business). Left off the resume. */
    offline: [
      'alconexfire.com.au', 'battingcagesusa.com', 'canberraprecincts.com.au', 'casinobonuslister.com',
      'cccapitalgrp.com', 'coasterpedicab.com', 'daniel-allen.net', 'dxbwebsite.com', 'ecftech.com.br',
      'elevate.ca', 'eperfectsolutions.com', 'essentialdesigns.net', 'fabearseco.com', 'focusmx.com',
      'freelimitedcompany.com', 'ivyladder.com', 'janaflamelesscandles.com', 'movingwithgrace.ca',
      'mytlcteam.com', 'naturus.com', 'neviahomehub.com', 'nexcelom.com', 'pedicaboutdoor.com',
      'pforadio.com', 'thecorporateeventguys.com', 'theregisteredoffice.com', 'thought-bomb.net',
      'uniksy.com', 'vont.com'
    ],
    /* Real products whose public URL is gone: listed without a link. */
    unlink: ['MSXI mWISE', 'XcooBee (Art of Living)', 'Talent Recognition'],
    /* Shorter resume descriptions (the web page keeps the full text). */
    shortDesc: {
      'MSXI mWISE': 'Warranty platform for vehicle manufacturers covering importer audits and warranty assessments. Built the security and queue pages, table search filters and automated tests.',
      'Heritage Olympiad': 'Platform bringing heritage education into Indian schools. Built the front end and all APIs, Facebook and Google login, subscriptions and payment integration.',
      'XcooBee (Art of Living)': 'Privacy and consent network portal with multi-user chat, secure data sharing, a payment wizard and a React Native mobile app, plus specs and code reviews.'
    }
  },

  /* Resume Projects section, in the reference layout: title, one-line
     description, Tech Stack, My Role bullets. Each variant picks and orders
     these by key (atsVariants[*].projects). Facts come from the source CVs
     and from what Maninder has described directly. */
  atsProjects: {
    missional: {
      title: 'MissionalAgents - AI Phone Receptionist SaaS for Churches',
      brief: 'MissionalAgents, a multi-tenant AI phone-receptionist SaaS for churches. A VAPI voice AI agent answers the phone line of each church, classifies calls by topic, answers from a church-specific Knowledge Engine and transfers live or takes a message. Built staff email notifications with per-contact frequency and spam screening with Nomorobo and Twilio Lookup',
      links: [{ label: 'app.missionalagents.com', url: 'https://app.missionalagents.com/' }],
      desc: 'Multi-tenant SaaS where a VAPI voice AI agent answers the inbound phone line of each church, classifies the call by topic, answers from a church-specific Knowledge Engine, and transfers live or takes a message per topic.',
      tech: ['React 19', 'Vite', 'TypeScript', 'VAPI Voice AI', 'Twilio', 'Nomorobo', 'REST API'],
      role: [
        'Built <strong>staff email notifications</strong> with a per-contact frequency setting (every call, daily, weekly or never).',
        'Worked with per-topic call routing (live transfer during work hours or message capture), Knowledge Engine onboarding data, and spam screening via <strong>Nomorobo and Twilio Lookup</strong>.'
      ]
    },
    providerpassport: {
      title: 'Provider Passport - Healthcare Provider Credentialing Platform',
      brief: 'Provider Passport, a healthcare credentialing platform. Built Angular and Java Spring features for managing hospital, clinic, doctor, nurse and staff records, and the patient and provider data each insurance company requires',
      links: [{ label: 'providerpassport.io', url: 'https://www.providerpassport.io/' }],
      desc: 'Platform that manages records for hospitals, clinics, doctors, nurses and other staff, together with the patient and provider data each insurance company requires.',
      tech: ['Angular', 'Java', 'Spring Framework', 'REST API', 'TypeScript'],
      role: [
        'Developed features across the <strong>Angular</strong> front end and the <strong>Java Spring</strong> REST back end.',
        'Built record management for <strong>hospitals, clinics, doctors, nurses and staff</strong>, and the configurable <strong>insurance data requirements</strong> for each insurer.'
      ]
    },
    mca: {
      title: 'MCA - Retail Product Survey Platform',
      brief: 'MCA retail product survey platform with four role-based apps (staff.mca.ca, fieldrep.mca.ca, superadmin.mca.ca and client admin). Built the Angular portals and the Ionic surveyor mobile app for survey jobs shared by client admins',
      links: [
        { label: 'staff.mca.ca', url: 'https://staff.mca.ca/' },
        { label: 'fieldrep.mca.ca', url: 'https://fieldrep.mca.ca/' },
        { label: 'superadmin.mca.ca', url: 'https://superadmin.mca.ca/' }
      ],
      desc: 'Supermarket product-survey platform with four role-based apps: field surveyors on a mobile app, client admins who publish survey jobs, staff, and a super admin who manages all clients.',
      tech: ['Angular', 'Ionic', 'TypeScript', 'REST API', 'Role-based Access Control'],
      role: [
        'Developed the <strong>four role-based applications</strong> (staff portal, field-rep app, client admin and super admin) in <strong>Angular</strong>.',
        'Built the surveyor <strong>Ionic mobile app</strong> for field submission of survey jobs shared by client admins, with super-admin oversight of every client.'
      ]
    },
    shopware: {
      title: 'Shopware eCommerce Storefronts - German Retail Clients',
      covers: ['koffer-to-go.de', 'frostkrone.de', 'meentzen.de', 'rbb-online-shop.de'],
      desc: 'Storefronts for German retail brands including koffer-to-go.de, frostkrone.de, meentzen.de and rbb-online-shop.de.',
      tech: ['Shopware 6', 'Symfony', 'PHP 8', 'Twig', 'MySQL', 'JavaScript'],
      role: [
        'Built <strong>meentzen.de</strong> and <strong>frostkrone.de</strong> from scratch as fully responsive storefronts with custom themes.',
        'Developed custom <strong>plugins and modules</strong> extending catalog browsing, checkout, shipping options and customer accounts.',
        'Delivered <strong>koffer-to-go.de</strong> on Shopware 6 with secure payments, shipping configuration and account management.'
      ]
    },
    schmetterling: {
      title: 'Schmetterling - Flight and Hotel Booking Platform',
      covers: ['schmetterling.de'],
      links: [{ label: 'schmetterling.de', url: 'https://schmetterling.de/' }],
      desc: 'Multi-tenant airline and hotel booking platform built on Symfony and PostgreSQL, with a microservices back end.',
      tech: ['Symfony', 'Laminas', 'PHP', 'PostgreSQL', 'Microservices', 'Multi-tenancy', 'Angular', 'REST API'],
      role: [
        'Built the <strong>Laminas microservices</strong> alongside the multi-tenant <strong>Symfony</strong> application on <strong>PostgreSQL</strong>, plus new Symfony components and the <strong>Angular</strong> interface.',
        'Owned the <strong>Campaign Master, Notes Management and Newsletter Unsubscription</strong> services end to end.'
      ]
    },
    mwise: {
      title: 'mWISE - Warranty Management Platform (MSX International)',
      covers: ['MSXI mWISE'],
      desc: 'Warranty platform giving vehicle manufacturers accuracy and transparency across importer audits and warranty assessments.',
      tech: ['React', 'TypeScript', 'Redux', 'Redux-Saga', 'Material UI', 'REST API'],
      role: [
        'Designed and built the <strong>security and queue pages</strong> and redesigned the profile page.',
        'Added search and filtering across the allocation, unallocated-claims, roles and admin-management tables.',
        'Wrote <strong>automated tests</strong> and handled client communication and deployment.'
      ]
    },
    xcoobee: {
      title: 'XcooBee - Privacy and Consent Management Portal',
      covers: ['XcooBee (Art of Living)'],
      desc: 'Privacy network portal with multi-user chat, secure data sharing, cookie and consent management and subscription packages.',
      tech: ['React', 'Node.js', 'GraphQL', 'MongoDB', 'React Native', 'Braintree'],
      role: [
        'Built consent management, QR scanning and the <strong>payment wizard</strong> with Braintree subscriptions.',
        'Delivered a <strong>React Native</strong> mobile portal with Redux and GraphQL.',
        'Authored technical specifications and test strategy, and performed code reviews.'
      ]
    }
  },

  dates: DATES
};

/* Node consumers (tools/model.js). Harmless in the browser: there is no
   `module` global there, so this is skipped. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CV, DATES, MONTHS, fmtMonthYear, fmtRange, yearsExperience, YEARS };
}
