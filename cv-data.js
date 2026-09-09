/* ------------------------------------------------------------------
   Maninder Singh — CV data (single source of truth)

   This file holds DATA ONLY. The web page renderer lives in cv.js and
   the resume generators live in tools/. Both read this file, so the
   published page and the .docx files can never drift apart.

   Browser:  loaded via <script src="cv-data.js"> before cv.js
   Node:     require('./cv-data.js') -> { CV, fmtMonthYear, fmtRange }
------------------------------------------------------------------ */

/* ==================================================================
   !! ESTIMATED — REPLACE WITH YOUR REAL DATES !!

   No employment date exists in ANY of the 11 source CVs in cv/ —
   not one month, not one year. The five dates below were derived by
   fitting the "years of experience" claims in those CVs against the
   dates the files were actually saved:

     "6+ years" as of Mar 2022  ->  6.5   fits
     "7 years"  as of Apr 2023  ->  7.6   fits
     "8+ years" as of Jan 2024  ->  8.4   fits
     "9+ years" as of Oct 2024  ->  9.1   fits

   All four converge on a career start of September 2015, which makes
   you 11 years experienced today — not the "9+" the old CV claimed,
   because that number was copied from a CV saved in October 2024 and
   never advanced.

   These are ESTIMATES of your own career. Correct them before you
   send this resume anywhere. Set datesEstimated to false once done;
   the build prints a warning until you do.
   ================================================================== */
const DATES = {
  datesEstimated: true,
  orioneStart: '2022-03',
  mavenStart: '2019-04',
  mavenEnd: '2022-02',
  vertexStart: '2015-09',
  vertexEnd: '2019-03',
  gradYear: '2015',
  careerStart: '2015-09'
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

/* ------------------------------------------------------------------ */

const CV = {
  name: 'Maninder Singh',

  /* Web hero title. The .docx uses atsTitle / atsVariants instead. */
  title: 'Senior Software Engineer — Full Stack Web Developer',

  /* Must stay EXACTLY equal to experience[0].role. Parsers cross-check the
     header title against the most recent job title; an exact match raises
     their confidence score. */
  atsTitle: 'Senior Software Engineer',

  /* Resume variants. Only the headline, emphasis and section order change —
     the employer-attached title is always the factual 'Senior Software
     Engineer'. A headline is positioning; a job entry is a claim. */
  atsVariants: {
    master: {
      file: 'Maninder-Singh-Senior-Software-Engineer',
      headline: 'Senior Software Engineer | Full Stack Developer (PHP, Symfony, Shopware, React)',
      lead: 'ecommerce',
      sections: ['summary', 'skills', 'experience', 'projects', 'education']
    },
    shopware: {
      file: 'Maninder-Singh-Shopware-Symfony-Developer',
      headline: 'Senior Shopware Developer | Shopware 6, Symfony and PHP 8 eCommerce Engineer',
      lead: 'ecommerce',
      sections: ['summary', 'skills', 'projects', 'experience', 'education']
    },
    product: {
      file: 'Maninder-Singh-Full-Stack-React-Engineer',
      headline: 'Senior Full Stack Engineer | React, TypeScript, Node.js, PHP and Symfony',
      lead: 'frontend',
      sections: ['summary', 'skills', 'experience', 'projects', 'education']
    },
    services: {
      file: 'Maninder-Singh-Senior-Software-Engineer-IN',
      headline: 'Senior Software Engineer | Full Stack (PHP, Symfony, React) | ' + YEARS + '+ Years',
      lead: 'ecommerce',
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
    { label: 'Location', value: 'Mohali, Punjab, India', href: null, icon: 'pin' },
    /* TODO Maninder: replace <handle> with your real LinkedIn URL, or delete
       this row. Most "AI recruiter" sourcing tools search LinkedIn and GitHub,
       not resume files sitting in an ATS — this is the highest-value line here. */
    { label: 'LinkedIn', value: 'linkedin.com/in/<handle>', href: 'https://www.linkedin.com/in/<handle>', icon: 'link', placeholder: true },
    { label: 'GitHub', value: 'github.com/maninder-dev', href: 'https://github.com/maninder-dev', icon: 'link', placeholder: true },
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

  /* The .docx joins these into ONE paragraph with tags stripped, so the web
     emphasis never reaches the resume text stream. Keep them factual and in
     sync — tools/verify-docx.sh diffs the stripped text against the .txt. */
  summary: [
    'Senior Software Engineer with <strong>' + YEARS + ' years</strong> building and shipping production web applications end to end, from back-end architecture through UI, testing, deployment and long-term maintenance. Specializes in eCommerce on <strong>Shopware and Symfony</strong>: six Shopware storefronts covering custom themes, Administration plugins and modules, Symfony microservices, a multi-tenant Symfony 5 platform, and Doctrine ORM data layers on PHP 8 and MySQL.',
    'Delivers front ends in <strong>React.js and TypeScript</strong> (Redux, Redux-Saga, React Hooks, Material UI) and Angular, with 80+ websites and applications delivered across WordPress, Joomla, WooCommerce, Magento and Shopify. Works directly with clients in Germany, the UK, the US, Canada and Australia on requirements, code review, automated tests and release in Agile Scrum teams.'
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

     [N] and [BRACKETED] text are placeholders for facts the source
     CVs do not contain. Nothing is invented. Fill or delete them.

     Which projects belong to which employer is ALSO an inference,
     from the technology recency and the title ladder. Confirm it.
     ---------------------------------------------------------------- */
  experience: [
    {
      company: 'Orione Solutions',
      role: 'Senior Software Engineer',
      location: 'Mohali, Punjab, India',
      start: DATES.orioneStart,
      end: null,
      current: true,
      points: [
        'Build and ship Shopware eCommerce storefronts for German and EU retail clients, [N] stores delivered and [N] built from scratch, covering custom Twig storefront themes, Administration plugins and Symfony-based modules.',
        'Develop back-end services in PHP 8 with Symfony and Doctrine ORM against MySQL, including [ONE CONCRETE SYSTEM: an ERP or product-feed import, a pricing and promotion rule engine, or multi-warehouse stock sync].',
        'Configure and extend checkout with payment and shipping providers including PayPal, Klarna and Payone, meeting German-market invoicing and consumer-payment expectations.',
        'Own client-facing delivery across [N] concurrent accounts: requirement analysis, estimation, code review, automated tests and production release.',
        'Work in Agile Scrum with daily stand-ups, sprint reviews and release planning, treating code review and automated tests as part of the definition of done.'
      ]
    },
    {
      company: 'Maven Softwares',
      role: 'Senior Software Developer',
      location: 'Mohali, Punjab, India',
      start: DATES.mavenStart,
      end: DATES.mavenEnd,
      points: [
        'Re-platformed a legacy travel-technology system into Symfony microservices with an Angular front end, owning the Campaign Master, Notes Management and Newsletter Unsubscription services end to end.',
        'Rebuilt a UK healthcare staffing marketplace in Symfony and MySQL, spanning job posting, locum verification, messaging, invoicing, statements and reporting, and delivered a multi-tenant Symfony 5 platform for a retail client.',
        'Built React and TypeScript interfaces for an OEM warranty and importer-audit platform at MSX International: designed the security and queue pages, added search and filtering across the allocation, unallocated-claims, roles and admin-management tables, redesigned the profile page, and wrote the automated tests.',
        'Delivered a privacy, cookie and consent-management portal on React, Node.js, GraphQL and MongoDB with a React Native companion app and Braintree payments; authored the technical and functional specifications and the test strategy.',
        'Shipped two further React platforms end to end: a psychometric assessment app with webcam capture, PDF report generation and Stripe payments, and a schools heritage-education platform where I designed and built all APIs, Facebook and Google OAuth, the subscription module and payment integration.'
      ]
    },
    {
      company: 'Vertex Info Solutions',
      role: 'Software Developer',
      location: 'Chandigarh, India',
      start: DATES.vertexStart,
      end: DATES.vertexEnd,
      points: [
        'Led full external and intranet site deployments on Joomla from planning and setup through launch and post-deployment support, building a custom mooTree file-navigation extension, an intranet gallery component, Gantry template customization and a Google Maps location finder.',
        'Consolidated a client\'s disparate static pages and dynamic fragments into a single Joomla codebase, integrating InfusionSoft and BeanStream payment APIs with Joomla membership objects and configuring the learning-management system.',
        'Migrated a life-sciences company from static HTML to WordPress: recreated several hundred pages, transferred content and assets, mapped 301 redirects, monitored broken links and built new lead-capture forms.',
        'Built a 150+ field online estimate form with admin-side capture and workflow for a moving-services client, and shipped a WordPress multisite management plugin with one-click setup, domain mapping, cPanel integration and bulk theme and plugin activation across child sites.',
        'Delivered custom PHP, WordPress, Joomla, WooCommerce and Magento sites end to end for clients in the UK, the US, Canada, Australia and Germany, including theme and plugin development, third-party API integration, payment gateway setup (Authorize.net, PayPal, K-Net, BeanStream) and LAMP hosting, SSL and DNS.'
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
    { group: 'Programming Languages', items: ['PHP 8', 'JavaScript (ES6+)', 'TypeScript', 'HTML5', 'CSS3', 'SQL'] },
    { group: 'PHP Frameworks', items: ['Symfony 5', 'Symfony 4', 'Symfony 2'] },
    { group: 'Ecommerce Platforms', items: ['Shopware 6', 'Shopware', 'Magento', 'WooCommerce', 'Shopify'] },
    { group: 'Content Management Systems', items: ['WordPress', 'Joomla'] },
    { group: 'Frontend', items: ['React.js', 'ReactJS', 'Redux', 'Redux-Saga', 'React Hooks', 'Angular', 'jQuery', 'Bootstrap', 'Material UI', 'Sass'] },
    { group: 'Backend and APIs', items: ['Node.js', 'GraphQL', 'REST API', 'RESTful', 'Doctrine ORM', 'MVC'] },
    { group: 'Databases', items: ['MySQL', 'MariaDB', 'MongoDB'] },
    { group: 'Cloud and Infrastructure', items: ['AWS (Amazon Web Services)', 'Apache', 'LAMP', 'WAMP', 'SSL', 'DNS', 'SSH'] },
    { group: 'Payments', items: ['Stripe', 'PayPal', 'Klarna', 'Payone', 'Braintree', 'Authorize.net', 'K-Net', 'BeanStream'] },
    { group: 'Tools and Practices', items: ['Git', 'GitHub', 'GitLab', 'Bitbucket', 'JIRA', 'Agile', 'Scrum', 'Unit Testing', 'Code Review', 'Search Engine Optimization (SEO)'] },
    { group: 'Industries', items: ['Ecommerce (e-commerce)', 'Fashion', 'Grocery', 'Furniture', 'Pharmaceutical', 'Food', 'Automotive Warranty', 'HR and Psychometrics', 'Consulting'] },
    { group: 'Also worked with', items: ['Vue.js', 'Laravel', 'Next.js', 'Styled Components', 'Docker', 'CI/CD (Continuous Integration and Continuous Delivery)', 'Microsoft Azure', 'PostgreSQL', 'Microsoft SQL Server', 'Oracle', 'PrestaShop', 'OpenCart', 'Express.js', 'SOAP'] }
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
        { name: 'schmetterling.de', url: 'https://schmetterling.de/', tags: ['Symfony', 'Angular', 'Microservices'], desc: 'Redeveloped microservices in Symfony with new components and an Angular UI. Owned the Campaign Master, Notes Management and Newsletter Unsubscriptions services.' },
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
        { name: 'Talent Recognition', url: 'https://app.talent-recognition.com/', tags: ['React', 'Redux', 'Stripe', '.NET'], desc: 'Psychometric testing web app with admin and user roles. Implemented web-camera capture and PDF generation, Stripe payments, the partner onboarding process and React-Redux/Hooks state management; defined QA procedures and deployment.' },
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

  /* Web only — never emitted to the .docx, where 779 characters of bare domain
     names carried zero skill keywords and read as keyword stuffing.
     Three gambling-affiliate domains (casinobonuslister.com,
     casinobonusbeater.com, allpokies.online) were removed outright: corporate
     egress filters and ATS attachment scanners flag them, and a filtered
     resume is dropped with no notification. */
  more: [
    'evergenius.com', 'honestdoctor.com', 'totumwealth.com', 'spasublime.com.au', 'realadvisor.ch',
    'canberraprecincts.com.au', 'cccapitalgrp.com', 'healthvision.de', 'illuminarla.com', 'sassaia.com',
    'fvcre.com', 'elevate.ca', 'telugu360.com', 'wpraffle.com', 'vont.com', 'obomovement.org',
    'avosys.com', 'focusmx.com', 'valcompliance.com', 'alconexfire.com.au', 'oceanatm.com',
    'logixicf.com', 'essentialdesigns.net', 'adconnector.com', 'blackrock-websolutions.de',
    'ooe-gaertner.innpuls-secure.at', 'pforadio.com', 'coasterpedicab.com', 'pedicaboutdoor.com',
    'uniksy.com', 'thecorporatefilmguys.com', 'thecorporateeventguys.com', 'mytlcteam.com',
    'intuitiveip.com', 'ivyladder.com', 'janaflamelesscandles.com', 'jacksmagic.com',
    'eperfectsolutions.com'
  ],

  /* Decisions the .docx needs and the web page does not. */
  atsProfile: {
    targetPages: 2,
    wordBudget: 1300,
    portfolioLine: 'Portfolio: 80+ additional websites and applications delivered across WordPress, Joomla, WooCommerce, Magento, Shopify and custom PHP for clients in the UK, US, Canada, Australia, Germany and Switzerland.',
    portfolioUrl: 'https://maninder-dev.github.io/'
  },

  dates: DATES
};

/* Node consumers (tools/model.js). Harmless in the browser: there is no
   `module` global there, so this is skipped. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CV, DATES, MONTHS, fmtMonthYear, fmtRange, yearsExperience, YEARS };
}
