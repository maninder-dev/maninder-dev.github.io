// Topic 125: Graceful Shutdown  (Full-Stack Handbook, Part 6)
// Run: npm run ex 125        (or: node 125-graceful-shutdown.js)
// What it shows: a child server gets a shutdown signal while a slow request is in flight. It stops
// accepting new connections, lets the in-flight request finish (200), closes the DB pool, exits 0.
// On Linux/macOS the signal is a real SIGTERM. On Windows, child.kill('SIGTERM') would kill the
// process outright without running any handler, so we send an IPC 'shutdown' message instead.
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';

const child = fork(new URL('./lib/shutdown-server.js', import.meta.url));
const logs = [];
const waitFor = (type) => new Promise((resolve) => {
  const on = (m) => { if (m.type === type) { child.off('message', on); resolve(m); } };
  child.on('message', on);
});
child.on('message', (m) => { if (m.type === 'log') { logs.push(m.msg); console.log('  child:', m.msg); } });

const { port } = await waitFor('listening');
const url = `http://127.0.0.1:${port}`;
console.log('child server listening on', port);

// 1. Start a slow request and wait until the server is handling it
const started = waitFor('request-started');
const inFlight = fetch(url + '/slow').then(async (r) => ({ status: r.status, body: await r.json() }));
await started;

// 2. Deploy happens: ask the server to shut down
const exited = once(child, 'exit');
if (process.platform === 'win32') child.send('shutdown');
else child.kill('SIGTERM');
console.log(`sent ${process.platform === 'win32' ? "IPC 'shutdown' (Windows fallback)" : 'SIGTERM'} mid-request`);

// 3. New connections are refused right away...
await new Promise((r) => setTimeout(r, 100));
const late = await fetch(url + '/slow').then((r) => `got ${r.status}`, (e) => e.cause?.code ?? e.message);
console.log('new request during shutdown ->', late);
assert.equal(late, 'ECONNREFUSED');

// 4. ...but the in-flight one still completes successfully
const result = await inFlight;
console.log('in-flight request ->', result.status, JSON.stringify(result.body));
assert.equal(result.status, 200);
assert.equal(result.body.done, true);

// 5. Clean exit after closing resources
const [code] = await exited;
console.log('child exit code:', code);
assert.equal(code, 0);
assert.match(logs[0], /received, shutting down/);
assert.equal(logs.at(-1), 'server closed, db pool closed, exiting 0');
console.log('OK');
