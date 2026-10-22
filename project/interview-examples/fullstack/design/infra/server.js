// Topic 205/207 - the tiny app the Dockerfile and Deployment run. 205-docker.js starts it to check
// that the /health and /ready endpoints used by HEALTHCHECK and the Kubernetes probes really exist.
import http from 'node:http';

let ready = false;
setTimeout(() => (ready = true), 100); // pretend to connect to the database first

const server = http.createServer((req, res) => {
  if (req.url === '/health') return res.writeHead(200, { 'content-type': 'application/json' }).end('{"status":"ok"}');
  if (req.url === '/ready') return res.writeHead(ready ? 200 : 503, { 'content-type': 'application/json' }).end(JSON.stringify({ ready }));
  res.writeHead(404).end();
});
server.listen(Number(process.env.PORT ?? 3000), () => console.log(`listening on ${server.address().port}`));
process.on('SIGTERM', () => server.close(() => process.exit(0))); // graceful shutdown for rolling updates
