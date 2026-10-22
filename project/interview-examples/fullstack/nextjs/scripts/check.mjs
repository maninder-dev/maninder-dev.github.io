// Checks for every Next.js topic (Full-Stack Handbook, Part 9 + topic 222).
// Run: npm test            (next build, then every check)
//      npm run ex 185      (one topic; builds first only if .next is missing)
//      BASE_URL=http://localhost:3000 npm run ex 185   (use a server you already started)
// Starts `next start` on a free port, requests each route with fetch, asserts status codes,
// redirects, headers and key text, then stops the server.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const NEXT_BIN = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let BASE = process.env.BASE_URL ?? '';

// ---------- helpers ----------
async function req(p, { method = 'GET', cookie, headers = {}, body, json } = {}) {
  const h = { ...headers };
  if (cookie) h.cookie = cookie;
  if (json !== undefined) { h['content-type'] = 'application/json'; body = JSON.stringify(json); }
  const res = await fetch(BASE + p, { method, headers: h, body, redirect: 'manual' });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, location: res.headers.get('location') ?? '' };
}
const val = (html, key) => {
  const m = html.match(new RegExp(`data-k="${key}"[^>]*>([^<]*)<`));
  assert.ok(m, `data-k="${key}" not found`);
  return m[1];
};
const has = (r, s) => assert.ok(r.text.replaceAll("<!-- -->", "").includes(s), `expected response to contain ${JSON.stringify(s)}`);
const status = (r, code, what) => assert.equal(r.status, code, `${what}: status ${r.status}, expected ${code}`);
async function waitForChange(p, key, old, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = val((await req(p)).text, key);
    if (v !== old) return v;
    await sleep(500);
  }
  assert.fail(`${p}: ${key} stayed ${old} for ${ms}ms`);
}
async function login(username, password) {
  const r = await req('/api/auth/login', { method: 'POST', json: { username, password } });
  status(r, 200, `login ${username}`);
  return r.headers.get('set-cookie').split(';')[0]; // "session=..."
}
// Submit a Server Action form the way a browser without JavaScript does (progressive enhancement).
async function submitAction(p, fields, cookie) {
  const html = (await req(p, { cookie })).text;
  const m = html.match(/name="(\$ACTION_ID_[^"]+)"/);
  assert.ok(m, `no server action form on ${p}`);
  const fd = new FormData();
  fd.append(m[1], '');
  for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
  return req(p, { method: 'POST', body: fd, cookie, headers: { origin: BASE } });
}
function staticJs() {
  const out = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f); else if (f.endsWith('.js')) out.push(fs.readFileSync(f, 'utf8'));
  } };
  walk(path.join(ROOT, '.next', 'static'));
  return out.join('\n');
}

// ---------- checks, one entry per topic ----------
const checks = {
  171: async () => {
    status(await req('/'), 200, 'home');
    const r = await req('/topics/171-what-is-nextjs'); status(r, 200, '171'); has(r, 'api/health');
    const h = await req('/api/health'); status(h, 200, 'health'); assert.equal(JSON.parse(h.text).ok, true);
  },
  172: async () => {
    const base = '/topics/172-rendering-strategies';
    status(await req(base), 200, '172 index');
    const s1 = val((await req(`${base}/static`)).text, 'generated-at');
    await sleep(50);
    assert.equal(val((await req(`${base}/static`)).text, 'generated-at'), s1, 'SSG time must not change');
    const d1 = val((await req(`${base}/dynamic`)).text, 'generated-at');
    await sleep(20);
    assert.notEqual(val((await req(`${base}/dynamic`)).text, 'generated-at'), d1, 'SSR time must change');
    const i1 = val((await req(`${base}/isr`)).text, 'generated-at');
    assert.equal(val((await req(`${base}/isr`)).text, 'generated-at'), i1, 'ISR inside the window: same');
    await sleep(5200);
    const i2 = await waitForChange(`${base}/isr`, 'generated-at', i1);
    console.log(`    ISR regenerated: ${i1} -> ${i2}`);
    const c = await req(`${base}/csr`); has(c, 'Loading time in the browser...');
    assert.match(JSON.parse((await req('/api/time')).text).now, /^\d{4}-/);
  },
  173: async () => {
    const r = await req('/pr/173/blog/hello-world'); status(r, 200, 'blog/[slug]'); has(r, '"page":"/pr/173/blog/[slug]"');
    const d = await req('/pr/173/docs/a/b/c'); status(d, 200, 'catch-all'); has(d, 'a / b / c');
    has(await req('/pr/173/shop'), 'Filters: none');
    has(await req('/pr/173/shop/x/y'), 'Filters: x, y');
    const u = await req('/api/pr/users'); status(u, 200, 'api route'); assert.equal(JSON.parse(u.text).length, 2);
  },
  174: async () => {
    status(await req('/topics/174-app-router'), 200, '174');
    const a = await req('/topics/174-app-router/about'); status(a, 200, 'route group'); has(a, 'inside a route group');
    const b = await req('/topics/174-app-router/blog/hello-world'); status(b, 200, 'blog'); has(b, '<h1>Hello World</h1>');
    has(b, '<title>Hello World | Next.js examples</title>');
    status(await req('/topics/174-app-router/blog/missing'), 404, 'dynamicParams=false');
    const t1 = val(b.text, 'generated-at');
    assert.equal(val((await req('/topics/174-app-router/blog/hello-world')).text, 'generated-at'), t1, 'prebuilt by generateStaticParams');
  },
  175: async () => {
    const base = '/topics/175-layouts-loading-error';
    const o = await req(base); status(o, 200, 'overview'); has(o, 'Layout counter');
    const s = await req(`${base}/settings`); status(s, 200, 'settings'); has(s, 'Settings page'); has(s, 'Layout counter');
    const slow = await req(`${base}/slow`); status(slow, 200, 'slow'); has(slow, 'Loading the slow page...'); has(slow, 'Slow page loaded');
    const p1 = await req(`${base}/products/1`); status(p1, 200, 'product 1'); has(p1, 'Keyboard');
    const p999 = await req(`${base}/products/999`); status(p999, 404, 'notFound()'); has(p999, 'Product not found (175 not-found.tsx)');
    // flaky fails on every other render: one of two consecutive requests hits error.tsx
    const f = [await req(`${base}/flaky`), await req(`${base}/flaky`)];
    const okOne = f.filter((r) => r.text.includes('Dashboard loaded on attempt'));
    assert.equal(okOne.length, 1, 'exactly one of two flaky renders succeeds');
    const failed = f.find((r) => !r.text.includes('Dashboard loaded on attempt'));
    console.log(`    flaky failure -> HTTP ${failed.status}, recovered render -> HTTP ${okOne[0].status}`);
    assert.ok(failed.text.includes('digest'), 'error is serialized with a digest, message hidden');
    assert.ok(!failed.text.includes('Upstream timed out'), 'production hides the error message');
  },
  176: async () => {
    const t0 = Date.now();
    const res = await fetch(BASE + '/topics/176-streaming-suspense');
    status(res, 200, '176');
    const dec = new TextDecoder(); let html = ''; let tFallback = 0; let tReviews = 0;
    for await (const chunk of res.body) {
      html += dec.decode(chunk, { stream: true });
      if (!tFallback && html.includes('Loading reviews...')) tFallback = Date.now() - t0;
      if (!tReviews && html.includes('Great clicky keys')) tReviews = Date.now() - t0;
    }
    console.log(`    fallback at ${tFallback}ms, reviews at ${tReviews}ms`);
    assert.ok(tFallback > 0 && tReviews > 0, 'both fallback and reviews present');
    assert.ok(tReviews - tFallback > 700, 'reviews streamed in later than the shell');
  },
  177: async () => {
    const r = await req('/topics/177-server-components'); status(r, 200, '177');
    has(r, 'Add to cart'); has(r, 'Rendered on the server: 4 products');
    assert.equal(val(r.text, 'masked-key'), 'sk_...3a9c');
    assert.ok(!r.text.includes('sk_demo_server_only_7f3a9c'), 'secret not in HTML/RSC payload');
    assert.ok(!staticJs().includes('sk_demo_server_only_7f3a9c'), 'secret not in any browser bundle');
  },
  178: async () => {
    const r = await req('/topics/178-rsc-bundle-size'); status(r, 200, '178');
    has(r, '<h2>Why Server Components?</h2>'); has(r, '<strong>Zero</strong>');
    assert.ok(!staticJs().includes('markedjs/marked'), 'marked is not shipped to the browser');
  },
  179: async () => {
    const r = await req('/pr/179-blog'); status(r, 200, '179'); has(r, 'Hello World');
    const t1 = val(r.text, 'generated-at');
    assert.equal(val((await req('/pr/179-blog')).text, 'generated-at'), t1, 'static inside the window');
    await sleep(5200);
    const t2 = await waitForChange('/pr/179-blog', 'generated-at', t1);
    console.log(`    getStaticProps ISR: ${t1} -> ${t2}`);
  },
  180: async () => {
    const anon = await req('/pr/180-orders'); status(anon, 307, 'no session');
    assert.ok(anon.location.includes('/topics/190-authentication/login?from=/pr/180-orders'));
    const cookie = await login('alice', 'alice123');
    const r = await req('/pr/180-orders', { cookie }); status(r, 200, 'with session'); has(r, 'Order #100');
    has(await req('/pr/180-orders?page=2', { cookie }), 'Order #104');
    status(await req('/pr/180-orders?page=99', { cookie }), 404, 'notFound');
  },
  181: async () => {
    const dir = path.join(ROOT, '.next', 'server', 'pages', 'pr', '181-products');
    assert.ok(fs.existsSync(path.join(dir, '1.html')) && fs.existsSync(path.join(dir, '2.html')), 'ids 1 and 2 prebuilt');
    has(await req('/pr/181-products/1'), 'Keyboard');
    const m = await req('/pr/181-products/3'); status(m, 200, 'fallback blocking'); has(m, 'Monitor');
    status(await req('/pr/181-products/999'), 404, 'unknown id');
  },
  182: async () => {
    const r = await req('/topics/182-data-fetching'); status(r, 200, '182');
    has(r, '<title>Dashboard for Alice | My Shop</title>');
    const seq = Number(val(r.text, 'sequential-ms')); const par = Number(val(r.text, 'parallel-ms'));
    console.log(`    sequential ${seq}ms, Promise.all ${par}ms`);
    assert.ok(seq >= 850 && par < seq * 0.6, 'Promise.all avoids the waterfall');
  },
  183: async () => {
    const a = (await req('/topics/183-fetch-caching')).text;
    const b = (await req('/topics/183-fetch-caching')).text;
    for (const k of ['force', 'revalidate', 'tagged']) assert.equal(val(b, k), val(a, k), `${k} is cached`);
    for (const k of ['default', 'nostore']) assert.ok(Number(val(b, k)) > Number(val(a, k)), `${k} is not cached`);
    assert.equal(val(b, 'unstable-cache-at'), val(a, 'unstable-cache-at'), 'unstable_cache result reused');
  },
  184: async () => {
    const r = await req('/topics/184-caching-layers'); status(r, 200, '184');
    has(r, 'Hi Alice'); has(r, 'Pro plan');
    assert.equal(val(r.text, 'memoized-calls'), '1', 'cache(): one db query');
    assert.equal(val(r.text, 'plain-calls'), '2', 'no cache(): two db queries');
    console.log('    fetch hits:', ['a', 'b', 'c', 'd'].map((k) => val(r.text, 'fetch-' + k)).join(' '));
    assert.equal(val(r.text, 'fetch-a'), val(r.text, 'fetch-b'), 'identical fetch() memoized');
    assert.equal(val(r.text, 'fetch-c'), val(r.text, 'fetch-d'), 'no-store fetch() memoized too');
  },
  185: async () => {
    const p = '/topics/185-on-demand-revalidation';
    const before = await req(p); status(before, 200, '185');
    const old = val(before.text, 'price-1');
    const price = 3000 + Math.floor(Math.random() * 5000);
    status(await req('/api/products/1', { method: 'PATCH', json: { price } }), 200, 'PATCH');
    assert.equal(val((await req(p)).text, 'price-1'), old, 'cached page still shows the old price');
    status(await req('/api/revalidate', { method: 'POST', headers: { 'x-secret': 'wrong' } }), 401, 'bad secret');
    const ok = await req('/api/revalidate', { method: 'POST', headers: { 'x-secret': 'demo-revalidate-secret' } });
    status(ok, 200, 'revalidate');
    assert.equal(val((await req(p)).text, 'price-1'), String(price), 'route handler revalidation');
    // Server Action form, submitted without JavaScript
    const price2 = price + 1;
    const a = await submitAction(p, { id: 2, price: price2 });
    assert.ok([200, 303].includes(a.status), `action status ${a.status}`);
    assert.equal(val((await req(p)).text, 'price-2'), String(price2), 'server action revalidation');
  },
  186: async () => {
    const p = '/topics/186-server-actions';
    const anon = await submitAction(p, { title: 'Anonymous todo' });
    status(anon, 303, 'action redirect'); assert.ok(anon.location.includes('error=auth'), 'auth checked');
    const cookie = await login('bob', 'bob123');
    const bad = await submitAction(p, { title: ' x ' }, cookie);
    assert.ok(bad.location.includes('error=title'), 'validated');
    const title = `Todo ${Date.now()}`;
    const good = await submitAction(p, { title }, cookie);
    assert.ok(good.location.includes('added='), 'created');
    has(await req(p, { cookie }), title);
    has(await req(`${p}?error=title`), 'Title must be 3 to 80 characters.');
  },
  187: async () => {
    status(await req('/topics/187-route-handlers'), 200, '187');
    const g = await req('/api/products?q=key'); status(g, 200, 'GET');
    assert.deepEqual(JSON.parse(g.text).map((p) => p.name), ['Keyboard']);
    const bad = await req('/api/products', { method: 'POST', json: { name: '' } }); status(bad, 400, 'POST invalid');
    assert.equal(JSON.parse(bad.text).errors.length, 2);
    const c = await req('/api/products', { method: 'POST', json: { name: 'Webcam', price: 3200 } }); status(c, 201, 'POST');
    const { id } = JSON.parse(c.text);
    status(await req(`/api/products/${id}`), 200, 'GET by id');
    status(await req(`/api/products/${id}`, { method: 'DELETE' }), 204, 'DELETE');
    status(await req(`/api/products/${id}`, { method: 'DELETE' }), 404, 'DELETE again');
  },
  188: async () => {
    const page = await req('/topics/188-middleware'); status(page, 200, '188');
    const id = page.headers.get('x-request-id');
    assert.match(id ?? '', /^[0-9a-f-]{36}$/, 'x-request-id header');
    assert.equal(val(page.text, 'request-id'), id, 'header forwarded to the page');
    const anon = await req('/topics/188-middleware/dashboard'); status(anon, 307, 'proxy redirect');
    assert.ok(anon.location.includes('/topics/190-authentication/login?from=%2Ftopics%2F188-middleware%2Fdashboard'), anon.location);
    const forged = await req('/topics/188-middleware/dashboard', { cookie: 'session=forged' });
    status(forged, 307, 'forged cookie passes proxy but page re-checks');
    const cookie = await login('bob', 'bob123');
    const ok = await req('/topics/188-middleware/dashboard', { cookie }); status(ok, 200, 'dashboard'); has(ok, 'Dashboard for Bob');
    const ab = await req('/topics/188-middleware/pricing'); status(ab, 200, 'A/B');
    const bucket = ab.headers.get('set-cookie')?.match(/ab=([ab])/)?.[1];
    assert.ok(bucket, 'ab cookie set'); has(ab, `Pricing variant ${bucket.toUpperCase()}`);
    has(await req('/topics/188-middleware/pricing', { cookie: 'ab=b' }), 'Pricing variant B');
    const sticky = await req('/topics/188-middleware/pricing', { cookie: 'ab=a' });
    has(sticky, 'Pricing variant A'); assert.equal(sticky.headers.get('set-cookie'), null, 'existing bucket kept');
  },
  189: async () => {
    const r = await req('/topics/189-images-fonts'); status(r, 200, '189');
    has(r, 'Loading map...'); assert.ok(!r.text.includes('Map rendered in the browser'), 'ssr:false not rendered on server');
    has(r, 'as="font"'); has(r, 'rel="preload" as="image"'); // priority -> preloaded LCP image
    const src = r.text.match(/src="(\/_next\/image\?url=[^"]+)"/)?.[1]?.replaceAll('&amp;', '&');
    assert.ok(src, 'next/image URL in HTML');
    const img = await fetch(BASE + src, { headers: { accept: 'image/webp,image/*' } });
    status(img, 200, 'image optimizer'); assert.match(img.headers.get('content-type'), /^image\//);
  },
  190: async () => {
    status(await req('/topics/190-authentication/login'), 200, 'login page');
    const bad = await req('/api/auth/login', { method: 'POST', json: { username: 'alice', password: 'nope' } });
    status(bad, 401, 'bad password');
    const res = await req('/api/auth/login', { method: 'POST', json: { username: 'alice', password: 'alice123' } });
    const setCookie = res.headers.get('set-cookie');
    assert.match(setCookie, /session=/); assert.match(setCookie, /HttpOnly/i); assert.match(setCookie, /SameSite=lax/i);
    const admin = setCookie.split(';')[0];
    const form = await req('/api/auth/login', { method: 'POST', body: new URLSearchParams({ username: 'bob', password: 'bob123', from: '/topics/190-authentication' }) });
    status(form, 303, 'form login redirects'); assert.ok(form.location.endsWith('/topics/190-authentication'));
    const user = form.headers.get('set-cookie').split(';')[0];
    status(await req('/topics/190-authentication/admin'), 307, 'anonymous -> login');
    status(await req('/topics/190-authentication/admin', { cookie: user }), 307, 'role user -> login');
    status(await req('/topics/190-authentication/admin', { cookie: admin.slice(0, -3) + 'abc' }), 307, 'tampered token');
    const ok = await req('/topics/190-authentication/admin', { cookie: admin }); status(ok, 200, 'admin'); has(ok, '<h1>Admin</h1>');
    has(await req('/topics/190-authentication', { cookie: admin }), 'Alice (admin)');
  },
  222: async () => {
    const r = await req('/topics/222-nextjs-questions'); status(r, 200, '222'); has(r, '#100'); has(r, 'Server Component vs Client Component?');
    const h = await req('/topics/222-nextjs-questions/hydration'); status(h, 200, 'hydration');
    assert.equal(val(h.text, 'good-clock'), '--:--', 'fix: same placeholder on server and client');
    const bad = await req('/topics/222-nextjs-questions/hydration?bad=1');
    assert.match(val(bad.text, 'bad-clock'), /^\d{4}-/, 'bug: server-rendered time the client will not match');
  },
};

// ---------- server lifecycle ----------
const freePort = () => new Promise((resolve) => {
  const s = net.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

async function startServer() {
  if (!fs.existsSync(path.join(ROOT, '.next', 'BUILD_ID'))) {
    console.log('No build found, running next build...');
    const b = spawnSync(process.execPath, [NEXT_BIN, 'build'], { cwd: ROOT, stdio: 'inherit' });
    if (b.status !== 0) process.exit(1);
  }
  const port = await freePort();
  BASE = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [NEXT_BIN, 'start', '-p', String(port), '-H', '127.0.0.1'], {
    cwd: ROOT, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  for (let i = 0; i < 120; i++) {
    // Probe with a page, not a route handler: in Next 16.4, if a route handler is the very first
    // module the server loads, fetch() request memoization in pages stays off (topic 184 catches it).
    try { if ((await fetch(`${BASE}/`)).ok) return { child, log: () => log }; } catch { /* not up yet */ }
    await sleep(250);
  }
  child.kill(); throw new Error(`next start did not come up:\n${log}`);
}
function stopServer(child) {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGTERM');
}

// ---------- main ----------
const wanted = process.argv.slice(2).map(Number).filter(Boolean);
const topics = wanted.length ? wanted : Object.keys(checks).map(Number);
for (const t of topics) if (!checks[t]) { console.error(`No checks for topic ${t}. Topics: ${Object.keys(checks).join(', ')}`); process.exit(1); }

const server = BASE ? null : await startServer();
console.log(`Testing against ${BASE}`);
let passed = 0; let failed = 0;
try {
  for (const t of topics) {
    const started = Date.now();
    try {
      await checks[t]();
      passed++; console.log(`PASS  topic ${t}  (${Date.now() - started} ms)`);
    } catch (e) {
      failed++; console.log(`FAIL  topic ${t}: ${e.message}`);
    }
  }
} finally {
  if (server) {
    if (failed && process.env.SHOW_SERVER_LOG) console.log(server.log());
    stopServer(server.child);
  }
}
console.log(`\n${passed} passed, ${failed} failed (${topics.length} topics)`);
process.exit(failed ? 1 : 0);
