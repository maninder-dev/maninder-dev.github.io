// Topic 215: How OAuth 2.0 "Login with Google" works (code + PKCE)  (Full-Stack Handbook, Part 11)
// Run: npm run ex 215        (or: node 215-oauth-pkce.js)
// What it shows: the authorization-code flow with PKCE against a FAKE provider running locally (no
// Google, no network). The provider checks the code_verifier against the code_challenge and issues an
// RS256-signed ID token; our app checks state, the token's signature, issuer, audience and nonce.
// Attacks shown failing: stolen code without the verifier, code reuse, and a forged state.
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, randomBytes } from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import { listen } from './lib.js';

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const sha256 = (s) => createHash('sha256').update(s).digest();

// ---------------- fake identity provider ----------------
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const codes = new Map(); // code -> { clientId, redirectUri, challenge, nonce, email }
const idp = express();
idp.use(express.urlencoded({ extended: false }));
idp.get('/authorize', (req, res) => {                       // user logs in and consents (auto here)
  const { client_id, redirect_uri, response_type, code_challenge, code_challenge_method, state, nonce } = req.query;
  if (response_type !== 'code' || code_challenge_method !== 'S256') return res.status(400).send('unsupported');
  const code = b64url(randomBytes(16));
  codes.set(code, { clientId: client_id, redirectUri: redirect_uri, challenge: code_challenge, nonce, email: 'ann@gmail.example' });
  res.redirect(`${redirect_uri}?code=${code}&state=${encodeURIComponent(state)}`);
});
idp.post('/token', (req, res) => {
  const { code, client_id, redirect_uri, code_verifier } = req.body;
  const c = codes.get(code);
  codes.delete(code);                                       // single use
  if (!c || c.clientId !== client_id || c.redirectUri !== redirect_uri) return res.status(400).json({ error: 'invalid_grant' });
  if (b64url(sha256(code_verifier ?? '')) !== c.challenge) return res.status(400).json({ error: 'invalid_grant', detail: 'PKCE verification failed' });
  const id_token = jwt.sign({ email: c.email, nonce: c.nonce }, privateKey, { algorithm: 'RS256', issuer: ISSUER, audience: client_id, subject: 'g-1234', expiresIn: '5m' });
  res.json({ access_token: b64url(randomBytes(24)), id_token, token_type: 'Bearer', expires_in: 3600 });
});
const provider = await listen(idp);
const ISSUER = provider.url;

// ---------------- our app (the OAuth client) ----------------
const CLIENT_ID = 'shop-web';
const REDIRECT_URI = 'https://app.example.com/auth/callback';
const pending = new Map(); // state -> { verifier, nonce }   (in a real app: in the user's pre-login session)

function startLogin() {
  const verifier = b64url(randomBytes(32));
  const state = b64url(randomBytes(16));
  const nonce = b64url(randomBytes(16));
  pending.set(state, { verifier, nonce });
  const q = new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, response_type: 'code', scope: 'openid email',
    code_challenge: b64url(sha256(verifier)), code_challenge_method: 'S256', state, nonce });
  return `${ISSUER}/authorize?${q}`;
}
async function exchange(code, verifier) {
  const r = await fetch(`${ISSUER}/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, code_verifier: verifier }) });
  return { status: r.status, body: await r.json() };
}
async function callback(callbackUrl) {
  const { searchParams } = new URL(callbackUrl);
  const p = pending.get(searchParams.get('state'));
  if (!p) throw new Error('state mismatch (possible login CSRF)');
  pending.delete(searchParams.get('state'));
  const { status, body } = await exchange(searchParams.get('code'), p.verifier);
  if (status !== 200) throw new Error(body.error);
  const claims = jwt.verify(body.id_token, publicKey, { algorithms: ['RS256'], issuer: ISSUER, audience: CLIENT_ID });
  if (claims.nonce !== p.nonce) throw new Error('nonce mismatch');
  return { userId: claims.sub, email: claims.email };       // find or create the user, start a session
}

// 1-2. Browser goes to the provider; the provider redirects back with a code
const authUrl = startLogin();
console.log('1. redirect to :', authUrl.slice(0, 110) + '...');
const redirect = await fetch(authUrl, { redirect: 'manual' });
const cb = redirect.headers.get('location');
console.log('3. callback    :', cb.replace(/code=[^&]+/, 'code=...'));
assert.equal(redirect.status, 302);

// An attacker who intercepts the code (e.g. from logs or a malicious app) has no verifier
const stolenCode = new URL(cb).searchParams.get('code');
const attempt = await exchange(stolenCode, b64url(randomBytes(32)));
console.log('stolen code    :', attempt.status, attempt.body);
assert.equal(attempt.body.detail, 'PKCE verification failed');

// Codes are single-use, so even the legit callback now fails: the provider burned it
await assert.rejects(callback(cb), /invalid_grant/);

// Clean run
const cb2 = (await fetch(startLogin(), { redirect: 'manual' })).headers.get('location');
const session = await callback(cb2);
console.log('6. logged in   :', session);
assert.deepEqual(session, { userId: 'g-1234', email: 'ann@gmail.example' });
await assert.rejects(callback(cb2), /state mismatch/, 'replaying the callback fails: state was consumed');

// A callback the user never started (login CSRF) is rejected by the state check
await assert.rejects(callback(`${REDIRECT_URI}?code=abc&state=forged`), /state mismatch/);
console.log('attacks        : stolen code, reused code, forged state -> all rejected');

await provider.close();
console.log('OK: code + PKCE + state + verified ID token');
