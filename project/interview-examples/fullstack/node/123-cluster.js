// Topic 123: Clustering and Load Balancing  (Full-Stack Handbook, Part 6)
// Run: npm run ex 123        (or: node 123-cluster.js)
// What it shows: the primary forks 2 workers that share one port; each worker answers exactly one
// request (reporting its own pid) and then exits cleanly. Nginx/PM2 configs are not run here.
import assert from 'node:assert/strict';
import cluster from 'node:cluster';
import http from 'node:http';
import { once } from 'node:events';

if (cluster.isPrimary) {
  // Round-robin in the primary (default everywhere except Windows; set it so this demo is the same on all OSes)
  cluster.schedulingPolicy = cluster.SCHED_RR;
  const workers = [cluster.fork(), cluster.fork()];
  const exits = [];
  cluster.on('exit', (w, code) => {
    exits.push({ pid: w.process.pid, code });
    console.log(`worker ${w.process.pid} exited with code ${code}`); // real app: cluster.fork() to replace it
  });

  // Both workers listen on port 0; the primary owns one shared port and hands out connections
  const ports = await Promise.all(workers.map((w) => once(w, 'listening').then(([addr]) => addr.port)));
  assert.equal(ports[0], ports[1], 'workers share one port');
  console.log(`primary ${process.pid}: 2 workers sharing port ${ports[0]}`);

  const answeredBy = [];
  for (let i = 0; i < 2; i++) {
    const res = await fetch(`http://127.0.0.1:${ports[0]}/`, { headers: { Connection: 'close' } });
    const { pid } = await res.json();
    console.log(`request ${i + 1} answered by worker ${pid}`);
    answeredBy.push(pid);
    // wait for that worker to exit before the next request, so the next one must go to the other worker
    while (!exits.some((e) => e.pid === pid)) await once(cluster, 'exit');
  }

  const workerPids = workers.map((w) => w.process.pid).sort();
  assert.deepEqual([...answeredBy].sort(), workerPids, 'each worker answered one request');
  assert.deepEqual(exits.map((e) => e.code), [0, 0], 'both workers exited cleanly');
  console.log('OK');
} else {
  // Each worker runs the app. One request, then close the server and exit 0.
  const server = http.createServer((req, res) => {
    res.setHeader('Connection', 'close');
    res.end(JSON.stringify({ pid: process.pid }));
    server.close(() => process.exit(0));
  });
  server.listen(0);
}
