// Topic 199: Designing File Uploads  (Full-Stack Handbook, Part 10)
// Run: npm run ex 199        (or: node 199-presigned-upload.js)
// What it shows: the pre-signed URL flow with a fake object store. The API validates type and size and
// returns an HMAC-signed PUT URL with an expiry; the store checks signature, expiry and content type;
// a "worker" then checks the real bytes (magic number), because the client's MIME type can lie.
// (Simulation of S3 presigning: same idea - the URL carries a signature over method, key and expiry.)
import assert from 'node:assert/strict';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import express from 'express';
import { listen } from './lib.js';

const SIGNING_KEY = 'storage-signing-key-for-demo-only';
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];
const MAX = 5 * 1024 * 1024;
const now = () => Math.floor(Date.now() / 1000);
const sigFor = (method, key, expires, contentType) =>
  createHmac('sha256', SIGNING_KEY).update(`${method}\n${key}\n${expires}\n${contentType}`).digest('hex');

// --- Object store (stands in for S3) ---
const bucket = new Map();
const store = express();
store.put('/bucket/*key', express.raw({ type: '*/*', limit: MAX }), (req, res) => {
  const key = req.params.key.join('/');
  const { expires, sig } = req.query;
  const contentType = req.get('content-type');
  const expected = Buffer.from(sigFor('PUT', key, expires, contentType), 'hex');
  const given = Buffer.from(String(sig), 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return res.status(403).send('SignatureDoesNotMatch');
  if (Number(expires) < now()) return res.status(403).send('Request has expired');
  bucket.set(key, { contentType, bytes: req.body });
  res.sendStatus(200);
});
const s3 = await listen(store);

// --- Our API: decides who may upload what, but never touches the bytes ---
const api = express();
api.use(express.json());
api.post('/api/uploads', (req, res) => {
  const { contentType, size, expiresIn = 300 } = req.body;
  if (!ALLOWED.includes(contentType)) return res.status(400).json({ error: 'Only PNG, JPEG or WebP images are allowed' });
  if (size > MAX) return res.status(400).json({ error: 'Images must be 5 MB or smaller' });
  const key = `avatars/user-7/${randomUUID()}`; // never use the client's file name as the key
  const expires = now() + expiresIn;
  const uploadUrl = `${s3.url}/bucket/${key}?expires=${expires}&sig=${sigFor('PUT', key, expires, contentType)}`;
  res.json({ uploadUrl, key });
});
const apiSrv = await listen(api);

const ask = (body) => fetch(`${apiSrv.url}/api/uploads`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const put = (u, bytes, type) => fetch(u, { method: 'PUT', headers: { 'content-type': type }, body: bytes });

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

// API-side validation
assert.equal((await ask({ contentType: 'application/x-msdownload', size: 10 })).status, 400);
assert.equal((await ask({ contentType: 'image/png', size: 50 * 1024 * 1024 })).status, 400);
console.log('API rejects   : .exe type, 50 MB size');

// Happy path: client PUTs straight to storage
const { uploadUrl, key } = await (await ask({ contentType: 'image/png', size: PNG.length })).json();
let r = await put(uploadUrl, PNG, 'image/png');
console.log('direct PUT    :', r.status, key);
assert.equal(r.status, 200);
assert.ok(bucket.has(key));

// Tampering with the key (upload into someone else's folder) breaks the signature
r = await put(uploadUrl.replace('user-7', 'user-1'), PNG, 'image/png');
assert.equal(r.status, 403);
// Changing the content type also breaks it (it was part of what we signed)
r = await put(uploadUrl, PNG, 'text/html');
assert.equal(r.status, 403);
console.log('tampered      : other key -> 403, other content-type -> 403');

// Expired URL
const old = await (await ask({ contentType: 'image/png', size: 10, expiresIn: -1 })).json();
r = await put(old.uploadUrl, PNG, 'image/png');
assert.equal(r.status, 403);
assert.equal(await r.text(), 'Request has expired');
console.log('expired URL   : 403');

// The client says image/png but sends an HTML page: the post-upload worker checks magic bytes.
const evil = await (await ask({ contentType: 'image/png', size: 30 })).json();
await put(evil.uploadUrl, Buffer.from('<script>alert(1)</script>'), 'image/png');
const sniff = (b) => (b.subarray(0, 8).equals(PNG.subarray(0, 8)) ? 'image/png' : b[0] === 0xff && b[1] === 0xd8 ? 'image/jpeg' : 'unknown');
const scan = (k) => { const o = bucket.get(k); return sniff(o.bytes) === o.contentType ? 'accepted' : 'quarantined'; };
console.log('worker scan   : real PNG ->', scan(key), '| fake PNG ->', scan(evil.key));
assert.equal(scan(key), 'accepted');
assert.equal(scan(evil.key), 'quarantined');

await apiSrv.close(); await s3.close();
console.log('OK: the URL only allows a PUT of one key and content type, until it expires');
