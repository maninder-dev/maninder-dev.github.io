// Topic 215: XSS vs CSRF  (Full-Stack Handbook, Part 11)
// Run: npm run ex 215        (or: node 215-xss-csrf.js)
// What it shows: XSS - a comment rendered unescaped really runs its script in a jsdom page and reads the
// cookie; escaped, it is inert text. CSRF - a forged cross-site POST carries the victim's cookie, so the
// server must check a CSRF token; SameSite=Lax cookies are not even attached to cross-site POSTs.
import assert from 'node:assert/strict';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { JSDOM, CookieJar } from 'jsdom';
import express from 'express';
import cookieParser from 'cookie-parser';
import { listen } from './lib.js';

// ---------- XSS ----------
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const comment = `Nice post!<script>window.stolen = document.cookie</script>`;
const render = (body) => `<!doctype html><html><body><div class="comment">${body}</div></body></html>`;

function openPage(html) {
  const jar = new CookieJar();
  jar.setCookieSync('prefs=dark-mode', 'https://blog.example/');           // readable by JS
  jar.setCookieSync('session=abc123; HttpOnly', 'https://blog.example/');  // not readable by JS
  return new JSDOM(html, { url: 'https://blog.example/post/1', runScripts: 'dangerously', cookieJar: jar }).window;
}

let win = openPage(render(comment));
console.log('unescaped     : script ran, stole ->', JSON.stringify(win.stolen));
assert.equal(win.stolen, 'prefs=dark-mode', 'the injected script executed');
assert.ok(!win.stolen.includes('session'), 'the httpOnly session cookie stayed out of reach');

win = openPage(render(escapeHtml(comment)));
console.log('escaped       : script ran?', win.stolen !== undefined, '| shown as text:', win.document.querySelector('.comment').textContent.slice(0, 30) + '...');
assert.equal(win.stolen, undefined);
assert.ok(win.document.querySelector('.comment').textContent.includes('<script>'));

// textContent (or React's {value}) is the DOM-side equivalent of escaping; innerHTML is not
win = openPage(render(''));
win.document.querySelector('.comment').textContent = '<img src=x onerror="alert(1)">';
assert.equal(win.document.querySelectorAll('img').length, 0);
win.document.querySelector('.comment').innerHTML = '<img src=x onerror="alert(1)">';
assert.equal(win.document.querySelectorAll('img[onerror]').length, 1, 'innerHTML created a live element with a handler');
console.log('DOM APIs      : textContent -> text, innerHTML -> live <img onerror>');

// ---------- CSRF ----------
const sessions = new Map();
const app = express();
app.use(cookieParser(), express.urlencoded({ extended: false }));
app.post('/login', (req, res) => {
  const sid = randomBytes(16).toString('hex');
  const csrf = randomBytes(16).toString('hex');                // synchronizer token, tied to the session
  sessions.set(sid, { user: 'victim', csrf, balance: 100_000 });
  res.cookie('sid', sid, { httpOnly: true, secure: true, sameSite: 'lax' }).json({ csrfToken: csrf });
});
app.post('/transfer', (req, res) => {
  const s = sessions.get(req.cookies.sid);
  if (!s) return res.status(401).send('login required');
  const sent = Buffer.from(String(req.body._csrf ?? req.get('x-csrf-token') ?? ''));
  const expected = Buffer.from(s.csrf);
  if (sent.length !== expected.length || !timingSafeEqual(sent, expected)) return res.status(403).send('CSRF token missing or wrong');
  s.balance -= Number(req.body.amount);
  res.send(`sent ${req.body.amount} to ${req.body.to}`);
});
const bank = await listen(app);

let r = await fetch(`${bank.url}/login`, { method: 'POST' });
const { csrfToken } = await r.json();
const setCookie = r.headers.getSetCookie()[0];          // sid=...; Path=/; HttpOnly; Secure; SameSite=Lax
const cookie = setCookie.split(';')[0];
const form = (fields) => new URLSearchParams(fields).toString();
const post = (fields, extraHeaders = {}) => fetch(`${bank.url}/transfer`, {
  method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', ...extraHeaders }, body: form(fields),
});

// evil.com's hidden form: the browser attaches the cookie (if SameSite allows) but evil.com can't know the token
r = await post({ to: 'attacker', amount: '50000' }, { cookie });
console.log('forged POST   :', r.status, await r.text());
assert.equal(r.status, 403);
// our own page includes the token from the session
r = await post({ to: 'landlord', amount: '20000', _csrf: csrfToken }, { cookie });
console.log('real POST     :', r.status, await r.text());
assert.equal(r.status, 200);
assert.equal([...sessions.values()][0].balance, 80_000);

// SameSite: what a browser attaches for a cross-site POST vs a same-site one (tough-cookie, as used by jsdom)
const jar = new CookieJar();
jar.setCookieSync(setCookie, 'https://bank.example/');
const crossSite = jar.getCookieStringSync('https://bank.example/transfer', { sameSiteContext: 'none' });
const sameSite = jar.getCookieStringSync('https://bank.example/transfer', { sameSiteContext: 'strict' });
console.log('SameSite=Lax  : cookie on cross-site POST =', JSON.stringify(crossSite), '| same-site =', sameSite.slice(0, 12) + '...');
assert.equal(crossSite, '');
assert.ok(sameSite.startsWith('sid='));

await bank.close();
console.log('OK: escape output against XSS; CSRF tokens + SameSite against CSRF');
