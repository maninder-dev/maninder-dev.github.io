# Full-Stack handbook: system design, JS core, HTTP, auth, TypeScript (topics 191-215, 223-224)

Runnable examples for Part 10 (System Design) and the Part 11 question bank. Every file prints labelled
output and asserts what it claims. Nothing needs Docker, a database server, Redis or a broker:
PostgreSQL is PGlite (in-process), Redis is ioredis-mock, the browser is jsdom, and queues, Kafka,
identity providers, object storage and payment webhooks are small in-process simulations (each file's
header says so).

```bash
npm install
npm test            # tsc --noEmit (checks the .ts files and the @ts-expect-error lines), then runs every example
npm run ex 215      # runs all files for one topic
node 194-saga.js    # or run one file directly (.ts files: npx tsx 223-ts-type-errors.ts)
```

Topics 205-207 come with real config files in [`infra/`](infra/): `Dockerfile`, `docker-compose.yml`,
`.github/workflows/ci.yml` and `k8s/deployment.yaml`. They are **not executed** by `npm test`; the
matching scripts parse them (js-yaml) and check them, and simulate the CI job graph and the rolling update.

| Topic | Title | File | Run |
|---|---|---|---|
| 191 | How to Approach a System Design Interview | [191-capacity-estimate.js](191-capacity-estimate.js) | `npm run ex 191` |
| 192 | Monolith vs Microservices | [192-monolith-vs-microservices.js](192-monolith-vs-microservices.js) | `npm run ex 192` |
| 193 | Microservice Communication Patterns (circuit breaker, opossum) | [193-circuit-breaker.js](193-circuit-breaker.js) | `npm run ex 193` |
| 194 | Distributed Transactions: The Saga Pattern | [194-saga.js](194-saga.js) | `npm run ex 194` |
| 195 | Message Queues (retries, backoff, DLQ) | [195-message-queue.js](195-message-queue.js) | `npm run ex 195` |
| 196 | Kafka vs RabbitMQ vs SQS (partition ordering) | [196-kafka-partitions.js](196-kafka-partitions.js) | `npm run ex 196` |
| 197 | Idempotency (Idempotency-Key middleware) | [197-idempotency-key.js](197-idempotency-key.js) | `npm run ex 197` |
| 198 | Designing a Payment System (webhook signatures, ledger) | [198-payment-webhook.js](198-payment-webhook.js) | `npm run ex 198` |
| 199 | Designing File Uploads (pre-signed URLs) | [199-presigned-upload.js](199-presigned-upload.js) | `npm run ex 199` |
| 200 | Caching at Every Layer (ETag / 304) | [200-http-caching.js](200-http-caching.js) | `npm run ex 200` |
| 201 | Load Balancing | [201-load-balancing.js](201-load-balancing.js) | `npm run ex 201` |
| 202 | Security Best Practices for Back Ends | [202-backend-security.js](202-backend-security.js) | `npm run ex 202` |
| 203 | Observability: Logs, Metrics, Traces | [203-observability.js](203-observability.js) | `npm run ex 203` |
| 204 | Testing Strategy | [204-testing-strategy.js](204-testing-strategy.js) | `npm run ex 204` |
| 205 | Docker | [205-docker.js](205-docker.js), [infra/Dockerfile](infra/Dockerfile), [infra/docker-compose.yml](infra/docker-compose.yml) | `npm run ex 205` |
| 206 | CI/CD Pipelines | [206-ci-pipeline.js](206-ci-pipeline.js), [infra/.github/workflows/ci.yml](infra/.github/workflows/ci.yml) | `npm run ex 206` |
| 207 | Deployment Strategies | [207-deployment-strategies.js](207-deployment-strategies.js), [infra/k8s/deployment.yaml](infra/k8s/deployment.yaml) | `npm run ex 207` |
| 208 | Interview Checklist: Trade-offs to Mention | [208-tradeoffs.js](208-tradeoffs.js) | `npm run ex 208` |
| 209 | JavaScript Core: Scope, Closures and Hoisting | [209-closures-hoisting.js](209-closures-hoisting.js) | `npm run ex 209` |
| 210 | JavaScript Core: this, Prototypes and Classes | [210-this-prototypes.js](210-this-prototypes.js) | `npm run ex 210` |
| 211 | JavaScript Core: Equality, Types and Copying | [211-equality-copying.js](211-equality-copying.js) | `npm run ex 211` |
| 212 | JavaScript Core: Async and Common Utilities | [212-async-utilities.js](212-async-utilities.js) | `npm run ex 212` |
| 213 | Browser and Web Fundamentals (jsdom) | [213-browser-fundamentals.js](213-browser-fundamentals.js) | `npm run ex 213` |
| 214 | HTTP, REST and APIs: status codes, PUT vs PATCH | [214-status-put-patch.js](214-status-put-patch.js) | `npm run ex 214` |
| 214 | HTTP, REST and APIs: CORS preflight | [214-cors-preflight.js](214-cors-preflight.js) | `npm run ex 214` |
| 214 | HTTP, REST and APIs: cursor pagination | [214-cursor-pagination.js](214-cursor-pagination.js) | `npm run ex 214` |
| 215 | Auth: sessions vs JWT, httpOnly cookies | [215-sessions-vs-jwt.js](215-sessions-vs-jwt.js) | `npm run ex 215` |
| 215 | Auth: XSS vs CSRF | [215-xss-csrf.js](215-xss-csrf.js) | `npm run ex 215` |
| 215 | Auth: authentication vs authorization (401 vs 403) | [215-authn-authz.js](215-authn-authz.js) | `npm run ex 215` |
| 215 | Auth: OAuth 2.0 code + PKCE | [215-oauth-pkce.js](215-oauth-pkce.js) | `npm run ex 215` |
| 215 | Auth: bcrypt vs SHA-256 | [215-password-hashing.js](215-password-hashing.js) | `npm run ex 215` |
| 223 | TypeScript: interface vs type, unknown, generics, utility types | [223-ts-types-generics.ts](223-ts-types-generics.ts) | `npm run ex 223` |
| 223 | TypeScript: discriminated unions and assertNever | [223-ts-discriminated-union.ts](223-ts-discriminated-union.ts) | `npm run ex 223` |
| 223 | TypeScript: type errors the compiler catches (@ts-expect-error) | [223-ts-type-errors.ts](223-ts-type-errors.ts) | `npm run ex 223` |
| 224 | System design Q: cache stampede (lock + jitter) | [224-cache-stampede.js](224-cache-stampede.js) | `npm run ex 224` |
| 224 | System design Q: exactly-once via idempotent consumer | [224-exactly-once.js](224-exactly-once.js) | `npm run ex 224` |
| 224 | System design Q: transactional outbox | [224-outbox.js](224-outbox.js) | `npm run ex 224` |
| 224 | System design Q: notification system | [224-notifications.js](224-notifications.js) | `npm run ex 224` |
| 224 | System design Q: scaling from 1k to 1M users | [224-scaling-stages.js](224-scaling-stages.js) | `npm run ex 224` |

Helpers (not examples): `lib.js` (start an Express app on port 0, `sleep`), `scripts/run-all.js`
(`npm test`), `scripts/ex.js` (`npm run ex`), `infra/server.js` (the app the Dockerfile runs; 205 starts it
to check `/health`).
