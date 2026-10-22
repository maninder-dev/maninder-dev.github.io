// Topic 219: Node.js Questions - single thread? CPU-heavy work?  (Full-Stack Handbook, Part 11)
// Run: npm run ex 219        (or: node 219-threads-and-cpu-jobs.js)
// What it shows: 4 pbkdf2 hashes run in parallel on libuv threads while the main thread keeps
// ticking; and the 202 + job-id pattern: the request returns at once and a worker thread does the
// work. An in-memory queue stands in for BullMQ (no Redis server needed).
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Worker } from 'node:worker_threads';
import express from 'express';
import { serve } from './lib/serve.js';

// --- Q. Is Node.js single-threaded? ---
const hash = () => new Promise((r) => crypto.pbkdf2('pw', 'salt', 200000, 64, 'sha512', r));
let t = performance.now();
await hash();
const one = performance.now() - t;

let ticks = 0;
const ticker = setInterval(() => ticks++, 5);
t = performance.now();
await Promise.all([hash(), hash(), hash(), hash()]);
const four = performance.now() - t;
clearInterval(ticker);
console.log(`1 hash: ${one.toFixed(0)} ms | 4 hashes at once: ${four.toFixed(0)} ms | main-thread ticks meanwhile: ${ticks}`);
assert.ok(four < one * 2.5, '4 hashes ran in parallel on the libuv pool');
assert.ok(ticks > 3, 'main thread was free meanwhile');

// --- Q. How do you handle CPU-heavy work? Return 202, process in the background ---
const jobs = new Map();
let nextId = 1;
const reportQueue = {
  async add(name, data) {
    const job = { id: String(nextId++), name, data, state: 'waiting', returnvalue: null };
    jobs.set(job.id, job);
    // "worker process": a worker thread runs the CPU-heavy part
    job.state = 'active';
    const w = new Worker(new URL('./lib/heavy-sum.js', import.meta.url), { workerData: 5e7 });
    w.once('message', (sum) => { job.state = 'completed'; job.returnvalue = { url: `/files/report-${job.id}.pdf`, sum }; });
    w.once('error', () => (job.state = 'failed'));
    return job;
  },
  async getJob(id) { return jobs.get(id); },
};

const app = express();
app.post('/reports', async (req, res) => {
  const job = await reportQueue.add('monthly', { userId: 7 });
  res.status(202).json({ jobId: job.id, status: 'processing' });
});
app.get('/reports/:jobId', async (req, res) => {
  const job = await reportQueue.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'No such job' });
  res.json({ state: job.state, url: job.returnvalue?.url });
});

const { url, close } = await serve(app);
t = performance.now();
const created = await fetch(url + '/reports', { method: 'POST' });
const { jobId, status } = await created.json();
console.log(`POST /reports -> ${created.status} in ${(performance.now() - t).toFixed(0)} ms`, { jobId, status });
assert.equal(created.status, 202);

let poll, polls = 0;
do {
  await new Promise((r) => setTimeout(r, 20));
  poll = await (await fetch(`${url}/reports/${jobId}`)).json();
  polls++;
} while (poll.state === 'active');
console.log(`after ${polls} polls:`, poll);
assert.deepEqual(poll, { state: 'completed', url: `/files/report-${jobId}.pdf` });
assert.equal((await fetch(url + '/reports/999')).status, 404);
await close();
console.log('OK');
