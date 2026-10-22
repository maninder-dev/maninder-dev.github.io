// Topic 110: Blocking the Event Loop  (Full-Stack Handbook, Part 6)
// Run: npm run ex 110        (or: node 110-blocking-event-loop.js)
// What it shows: a CPU loop in a route freezes every other request (measured with a /ping timer);
// moving the same loop to a worker thread keeps /ping fast. Same answer both ways.
// The server runs in a forked child process: if client and server shared one event loop, the
// blocking loop would freeze the client's timer too and hide the problem.
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { Worker } from 'node:worker_threads';
import express from 'express';

const N = 3e8; // the handbook uses 5e9; smaller so the demo takes well under a second per report

if (process.argv[2] === '--server') {
  const app = express();
  app.get('/ping', (req, res) => res.json({ pong: true }));

  // BAD: blocks every user on this process until the loop ends
  app.get('/report-blocking', (req, res) => {
    let sum = 0;
    for (let i = 0; i < N; i++) sum += i;
    res.json({ sum });
  });

  // GOOD: same work on a worker thread; the main thread stays free for other requests
  app.get('/report-worker', (req, res) => {
    const worker = new Worker(new URL('./lib/heavy-sum.js', import.meta.url), { workerData: N });
    worker.once('message', (sum) => res.json({ sum }));
    worker.once('error', (err) => res.status(500).json({ error: err.message }));
  });

  const server = app.listen(0, () => process.send({ port: server.address().port }));
  process.on('disconnect', () => process.exit(0));
} else {
  const child = fork(import.meta.filename, ['--server']);
  const [{ port }] = await once(child, 'message');
  const url = `http://127.0.0.1:${port}`;

  async function pingWhile(path) {
    const t0 = performance.now();
    const report = fetch(url + path).then((r) => r.json());
    await new Promise((r) => setTimeout(r, 30));   // let the report start first
    const t = performance.now();
    await fetch(url + '/ping').then((r) => r.json());
    const pingMs = performance.now() - t;
    const { sum } = await report;
    return { pingMs, reportMs: performance.now() - t0, sum };
  }

  const bad = await pingWhile('/report-blocking');
  const good = await pingWhile('/report-worker');
  console.log(`blocking report took ${bad.reportMs.toFixed(0)} ms; /ping waited ${bad.pingMs.toFixed(0)} ms`);
  console.log(`worker   report took ${good.reportMs.toFixed(0)} ms; /ping waited ${good.pingMs.toFixed(0)} ms`);

  assert.equal(bad.sum, good.sum, 'same result either way');
  assert.ok(bad.pingMs > 100, 'ping had to wait for the loop to finish');
  assert.ok(good.pingMs < bad.pingMs / 3, 'ping answered while the worker was busy');

  child.disconnect();
  await once(child, 'exit');
  console.log('OK');
}
