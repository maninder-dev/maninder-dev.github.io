// Topic 225: Debugging - memory grows until the server crashes  (Full-Stack Handbook, Part 11)
// Run: npm run ex 225        (or: node 225-listener-leak.js)
// What it shows: a Server-Sent Events route adds a 'message' listener per request. BUG - listeners
// are never removed, so every disconnected client stays in memory (and Node warns at 11).
// FIX - remove the listener on req 'close'. We open 20 clients, disconnect them, count listeners.
import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import http from 'node:http';
import express from 'express';
import { serve } from './lib/serve.js';

const warnings = [];
process.on('warning', (w) => warnings.push(w.name));

function makeApp(bus, removeOnClose) {
  const app = express();
  app.get('/live', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    res.write(': connected\n\n');
    const onMsg = (m) => res.write(`data: ${m}\n\n`);
    bus.on('message', onMsg);                                        // added per request...
    if (removeOnClose) req.on('close', () => bus.off('message', onMsg)); // ...the fix
  });
  return app;
}

async function run(label, removeOnClose) {
  const bus = new EventEmitter();
  const { url, close } = await serve(makeApp(bus, removeOnClose));
  const clients = [];
  for (let i = 0; i < 20; i++) {
    const req = http.get(url + '/live');
    const [res] = await once(req, 'response');
    await once(res, 'data');                 // connected
    clients.push({ req, res });
  }
  const whileOpen = bus.listenerCount('message');
  bus.emit('message', 'hello');               // everyone connected gets it
  const [chunk] = await once(clients[0].res, 'data');
  assert.match(chunk.toString(), /data: hello/);

  clients.forEach((c) => c.req.destroy());    // users close the tab
  await new Promise((r) => setTimeout(r, 100));
  const afterClose = bus.listenerCount('message');
  console.log(`${label}: listeners with 20 open = ${whileOpen}, after all disconnect = ${afterClose}`);
  await close();
  return { whileOpen, afterClose };
}

const bug = await run('BUG', false);
assert.equal(bug.whileOpen, 20);
assert.equal(bug.afterClose, 20, 'dead clients (and their res objects) stay reachable forever');

const fix = await run('FIX', true);
assert.equal(fix.whileOpen, 20);
assert.equal(fix.afterClose, 0, 'every listener removed on disconnect');

await new Promise((r) => setImmediate(r));
console.log('process warnings seen:', warnings.join(', ') || '(none)');
// The warning fires in both runs because 20 clients are connected at once. It is only a hint:
// a real fan-out bus with many live clients would raise bus.setMaxListeners() deliberately.
assert.ok(warnings.includes('MaxListenersExceededWarning'), 'Node hints at the leak once >10 listeners pile up');
console.log('OK');
