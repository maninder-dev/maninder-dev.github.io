# Node.js and Express examples

Full-Stack Interview Handbook, Part 6 (topics 102-128) plus question-bank topics 219 and 225.
Node 22, ES modules, Express 5. No Redis, database or internet needed: Redis is `ioredis-mock`,
tables and queues are in memory.

```
npm install
npm test          # runs every example, one PASS/FAIL line per file
npm run ex 125    # runs the example(s) for one topic with full output
```

| Topic | Title | File | Run |
|---|---|---|---|
| 102 | What is Node.js? | [102-what-is-node.js](102-what-is-node.js) | `npm run ex 102` |
| 103 | Node.js vs Browser JavaScript | [103-node-vs-browser.js](103-node-vs-browser.js) | `npm run ex 103` |
| 104 | Why Node.js is Fast | [104-why-node-is-fast.js](104-why-node-is-fast.js) | `npm run ex 104` |
| 105 | The Event Loop | [105-event-loop.js](105-event-loop.js) | `npm run ex 105` |
| 106 | Call Stack, Callback Queue and Microtask Queue | [106-call-stack-and-queues.js](106-call-stack-and-queues.js) | `npm run ex 106` |
| 107 | process.nextTick vs setImmediate vs setTimeout | [107-nexttick-setimmediate-settimeout.js](107-nexttick-setimmediate-settimeout.js) | `npm run ex 107` |
| 108 | How async/await Works Internally | [108-async-await.js](108-async-await.js) | `npm run ex 108` |
| 109 | What is libuv? | [109-libuv-thread-pool.js](109-libuv-thread-pool.js) | `npm run ex 109` |
| 110 | Blocking the Event Loop | [110-blocking-event-loop.js](110-blocking-event-loop.js) | `npm run ex 110` |
| 111 | Streams and Buffers | [111-streams-and-buffers.js](111-streams-and-buffers.js) | `npm run ex 111` |
| 112 | Modules: CommonJS vs ES Modules | [112-modules-cjs-vs-esm.js](112-modules-cjs-vs-esm.js) | `npm run ex 112` |
| 113 | What is Express.js? | [113-express-basics.js](113-express-basics.js) | `npm run ex 113` |
| 114 | Middleware: The Assembly Line | [114-middleware.js](114-middleware.js) | `npm run ex 114` |
| 115 | Middleware Order Matters | [115-middleware-order.js](115-middleware-order.js) | `npm run ex 115` |
| 116 | Error-Handling Middleware | [116-error-handling.js](116-error-handling.js) | `npm run ex 116` |
| 117 | Input Validation | [117-input-validation.js](117-input-validation.js) | `npm run ex 117` |
| 118 | JWT (JSON Web Tokens) | [118-jwt.js](118-jwt.js) | `npm run ex 118` |
| 119 | Refresh Tokens | [119-refresh-tokens.js](119-refresh-tokens.js) | `npm run ex 119` |
| 120 | Role-Based Access Control (RBAC) | [120-rbac.js](120-rbac.js) | `npm run ex 120` |
| 121 | Password Security with bcrypt | [121-bcrypt-passwords.js](121-bcrypt-passwords.js) | `npm run ex 121` |
| 122 | Caching with Redis in Node | [122-redis-caching.js](122-redis-caching.js) | `npm run ex 122` |
| 123 | Clustering and Load Balancing | [123-cluster.js](123-cluster.js) | `npm run ex 123` |
| 124 | Compression and Streaming Responses | [124-compression-streaming.js](124-compression-streaming.js) | `npm run ex 124` |
| 125 | Graceful Shutdown | [125-graceful-shutdown.js](125-graceful-shutdown.js) | `npm run ex 125` |
| 126 | Design: URL Shortener | [126-url-shortener.js](126-url-shortener.js) | `npm run ex 126` |
| 127 | Design: Rate Limiter | [127-rate-limiter.js](127-rate-limiter.js) | `npm run ex 127` |
| 128 | Design: Real-Time Chat with WebSockets | [128-socketio-chat.js](128-socketio-chat.js) | `npm run ex 128` |
| 219 | Node.js Questions: threads, CPU work and job queues | [219-threads-and-cpu-jobs.js](219-threads-and-cpu-jobs.js) | `npm run ex 219` |
| 219 | Node.js Questions: nextTick vs setImmediate, starvation | [219-nexttick-starvation.js](219-nexttick-starvation.js) | `npm run ex 219` |
| 219 | Node.js Questions: memory leak vs LRU cache | [219-memory-leak-lru.js](219-memory-leak-lru.js) | `npm run ex 219` |
| 219 | Node.js Questions: spawn vs exec vs fork | [219-child-process.js](219-child-process.js) | `npm run ex 219` |
| 219 | Node.js Questions: production-ready Express | [219-production-ready-express.js](219-production-ready-express.js) | `npm run ex 219` |
| 225 | Debugging: sessions lost behind two servers | [225-sessions-shared-store.js](225-sessions-shared-store.js) | `npm run ex 225` |
| 225 | Debugging: works in Postman, fails in the browser (CORS) | [225-cors-postman-vs-browser.js](225-cors-postman-vs-browser.js) | `npm run ex 225` |
| 225 | Debugging: job runs twice, made idempotent | [225-idempotent-job.js](225-idempotent-job.js) | `npm run ex 225` |
| 225 | Debugging: memory growth from per-request listeners | [225-listener-leak.js](225-listener-leak.js) | `npm run ex 225` |

`lib/` holds helpers that are not examples on their own (worker thread, forked child servers, modules
for topic 112). `scripts/run.js` is the runner behind `npm test` and `npm run ex`.

## Notes

- **106**: at the top level of an ES module, Promise callbacks run *before* `process.nextTick`,
  because module evaluation is itself a promise job. The handbook's order (nextTick first) holds
  inside any callback and in CommonJS. The file asserts both.
- **110**: the server runs in a forked child. If client and server shared one event loop, the
  blocking loop would freeze the client's timer too and hide the problem.
- **125**: on Windows `child.kill('SIGTERM')` ends the process immediately without running
  handlers, so the example sends an IPC `'shutdown'` message there. Elsewhere it sends a real SIGTERM.
- **Simulated or reduced**: Redis is `ioredis-mock`. The BullMQ queue (219, 126) and the job
  queue (225) are in memory. The Socket.IO Redis adapter (128) and the Nginx/PM2 configs (123) are
  described in comments but not run. The `connect-redis` store (225) is a 15-line store with the
  same behaviour. `pino-http` (219) is a small JSON logger. The "site is suddenly slow" question in
  225 (`pg_stat_activity`) is SQL and belongs in `../sql`.
