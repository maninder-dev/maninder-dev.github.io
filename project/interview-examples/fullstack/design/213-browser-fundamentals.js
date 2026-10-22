// Topic 213: Browser and Web Fundamentals  (Full-Stack Handbook, Part 11)
// Run: npm run ex 213        (or: node 213-browser-fundamentals.js)
// What it shows, in a jsdom browser environment: event delegation (works for elements added later),
// capture -> target -> bubble order and stopPropagation, localStorage/sessionStorage/cookies including an
// httpOnly cookie that JavaScript cannot read, and defer vs async script order with real script downloads.
import assert from 'node:assert/strict';
import { JSDOM, CookieJar } from 'jsdom';
import express from 'express';
import { listen, sleep } from './lib.js';

// ---------- event delegation ----------
let dom = new JSDOM(`<ul id="todo-list"><li>Milk <button data-id="1">x</button></li></ul>
  <div id="outer"><button id="inner">Click</button></div>`, { url: 'https://shop.example.com/' });
let { document, MouseEvent } = dom.window;
const deleted = [];
document.querySelector('#todo-list').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-id]');
  if (btn) deleted.push(btn.dataset.id);
});
document.querySelector('#todo-list').insertAdjacentHTML('beforeend', '<li>Eggs <button data-id="2">x</button></li>'); // added later
document.querySelector('[data-id="2"]').click();
document.querySelector('[data-id="1"]').click();
assert.deepEqual(deleted, ['2', '1']);
console.log('delegation    : one listener on <ul> handled clicks for items 2 (added later) and 1');

// ---------- capture vs bubble ----------
const order = [];
const outer = document.getElementById('outer');
const inner = document.getElementById('inner');
outer.addEventListener('click', () => order.push('outer capture'), { capture: true });
outer.addEventListener('click', () => order.push('outer bubble'));
inner.addEventListener('click', () => order.push('inner'));
inner.dispatchEvent(new MouseEvent('click', { bubbles: true }));
console.log('event phases  :', order.join(' -> '));
assert.deepEqual(order, ['outer capture', 'inner', 'outer bubble']);
order.length = 0;
inner.addEventListener('click', (e) => e.stopPropagation());
inner.dispatchEvent(new MouseEvent('click', { bubbles: true }));
assert.deepEqual(order, ['outer capture', 'inner'], 'stopPropagation: outer bubble did not run');
console.log('stopPropagation: outer bubble skipped');

// ---------- storage and cookies ----------
const { localStorage, sessionStorage } = dom.window;
localStorage.setItem('theme', 'dark');
sessionStorage.setItem('wizardStep', '2');
assert.equal(localStorage.getItem('theme'), 'dark');
assert.equal(typeof localStorage.getItem('theme'), 'string', 'storage holds strings only');
localStorage.setItem('n', 42);
assert.equal(localStorage.getItem('n'), '42');

// The server sets an httpOnly session cookie; the page sets a normal one.
const jar = new CookieJar();
jar.setCookieSync('session=s3cr3t; HttpOnly; Secure; SameSite=Lax; Path=/', 'https://shop.example.com/');
dom = new JSDOM('<p>page</p>', { url: 'https://shop.example.com/', cookieJar: jar });
dom.window.document.cookie = 'lang=hi; max-age=31536000; path=/; SameSite=Lax';
const visibleToJs = dom.window.document.cookie;
const sentToServer = jar.getCookieStringSync('https://shop.example.com/api/me');
console.log('document.cookie (JS sees)    :', visibleToJs);
console.log('Cookie header (server gets)  :', sentToServer);
assert.equal(visibleToJs, 'lang=hi', 'XSS cannot read the httpOnly session cookie');
assert.match(sentToServer, /session=s3cr3t/, 'but the browser still sends it');
assert.equal(jar.getCookieStringSync('http://shop.example.com/'), 'lang=hi', 'Secure cookie never goes over plain http');
assert.equal(jar.getCookieStringSync('https://evil.example/'), '', 'cookies are scoped to their site');

// ---------- defer vs async: real downloads with different delays ----------
const app = express();
const delays = { 'async.js': 5, 'defer-1.js': 120, 'defer-2.js': 5, 'blocking.js': 40 };
app.get('/s/:name', async (req, res) => {
  await sleep(delays[req.params.name]);
  res.type('js').send(`window.order.push(${JSON.stringify(req.params.name)})`);
});
app.get('/', (req, res) => res.type('html').send(`<!doctype html><html><head>
  <script>window.order = []; document.addEventListener('DOMContentLoaded', () => window.order.push('DOMContentLoaded'));</script>
  <script src="/s/defer-1.js" defer></script>
  <script src="/s/defer-2.js" defer></script>
  <script src="/s/async.js" async></script>
  <script src="/s/blocking.js"></script>
  <script>window.order.push('inline after blocking')</script>
  </head><body><p>content</p></body></html>`));
const srv = await listen(app);
const page = await JSDOM.fromURL(srv.url + '/', { runScripts: 'dangerously', resources: 'usable' });
await new Promise((r) => page.window.addEventListener('load', r));
const ran = page.window.order;
console.log('script order  :', ran.join(' -> '));
const at = (n) => ran.indexOf(n);
assert.ok(at('blocking.js') < at('inline after blocking'), 'a plain script blocks parsing until it runs');
assert.ok(at('defer-1.js') < at('defer-2.js'), 'defer keeps document order even though defer-1 downloads slower');
assert.ok(at('inline after blocking') < at('defer-1.js'), 'defer runs after parsing');
assert.ok(at('defer-2.js') < at('DOMContentLoaded'), 'defer runs before DOMContentLoaded');
assert.ok(at('async.js') !== -1, 'async ran whenever it was ready');
page.window.close();
await srv.close();
console.log('OK: delegation, event phases, storage/cookies and script loading verified in jsdom');
