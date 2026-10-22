// Small shared helpers for the examples (not an example itself).
import { once } from 'node:events';

// Start an Express app on a random free port; returns { url, close }.
export async function listen(app) {
  const server = app.listen(0);
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  return { url, server, close: () => new Promise((r) => { server.close(r); server.closeAllConnections(); }) };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
