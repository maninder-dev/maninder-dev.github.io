// Child server used by 125-graceful-shutdown.js. Forked with an IPC channel.
import express from 'express';

const app = express();
let shuttingDown = false;

app.use((req, res, next) => {
  if (shuttingDown) res.setHeader('Connection', 'close'); // don't keep sockets alive while draining
  next();
});
app.get('/slow', async (req, res) => {
  process.send({ type: 'request-started' });
  await new Promise((r) => setTimeout(r, 800)); // a slow in-flight request
  res.json({ done: true, pid: process.pid });
});

const server = app.listen(0, () => process.send({ type: 'listening', port: server.address().port }));

const db = { close: async () => new Promise((r) => setTimeout(r, 50)) }; // stands in for sequelize/redis

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.send({ type: 'log', msg: `${signal} received, shutting down` });
  server.close(async () => {          // stop new connections, wait for open ones
    await db.close();
    process.send({ type: 'log', msg: 'server closed, db pool closed, exiting 0' });
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref(); // force after 10s
}

process.on('SIGTERM', shutdown); // sent by Docker / Kubernetes (POSIX)
process.on('SIGINT', shutdown);  // Ctrl+C
// Windows has no real SIGTERM: child.kill('SIGTERM') there terminates the process immediately
// (TerminateProcess), so a handler would never run. Process managers on Windows use other
// channels; here the parent sends an IPC message that triggers the same shutdown path.
process.on('message', (m) => { if (m === 'shutdown') shutdown('shutdown message'); });
