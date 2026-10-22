# Interview handbook examples

Runnable code for every topic in the two interview handbooks. Each example checks what it
demonstrates, so a broken example fails its test. Nothing needs Docker or a running database:
in-process substitutes (PGlite, mongodb-memory-server, ioredis-mock, SQLite) stand in for servers.
See [CONVENTIONS.md](CONVENTIONS.md) for file naming and layout.

## Full-Stack Handbook (topics 1-228)

| Topics | Area | Folder | Index |
|---|---|---|---|
| 1-56, 87-101, 216-217 | SQL, PostgreSQL, MySQL, scaling databases | `fullstack/sql` | [README](fullstack/sql/README.md) |
| 57-86, 218 | MongoDB, Mongoose, ORMs (Drizzle) | `fullstack/mongo` | [README](fullstack/mongo/README.md) |
| 102-128, 219, 225 | Node.js core, Express, auth, queues, Socket.IO | `fullstack/node` | [README](fullstack/node/README.md) |
| 129-170, 220-221 | React 19 (Vitest + Testing Library) | `fullstack/react` | [README](fullstack/react/README.md) |
| 171-190, 222 | Next.js App Router and Pages Router | `fullstack/nextjs` | [README](fullstack/nextjs/README.md) |
| 191-215, 223-224 | System design, HTTP, security, JS core, TypeScript | `fullstack/design` | [README](fullstack/design/README.md) |

Topics 226-228 in the handbook (behavioural questions, questions to ask the interviewer, final
revision checklist) are not code topics, so they have no examples.

```bash
cd fullstack/<folder>
npm install
npm test            # run every example, prints PASS/FAIL per file
npm run ex 105      # run one topic
```

In `fullstack/nextjs`, `npm test` builds the app and checks each topic's route; `npm run dev`
lets you browse them at http://localhost:3000.

## Laravel Handbook (topics 1-107)

A Laravel 13 app in `laravel/`; each topic is a feature test. Index: [TOPICS.md](laravel/TOPICS.md).

```bash
cd laravel
composer install
cp .env.example .env && php artisan key:generate
php artisan test                      # all topics
php artisan test --filter=Topic042    # one topic
```

## Test status (Windows, Node 22, PHP 8.3)

| Folder | Result |
|---|---|
| fullstack/sql | 57 passed, 8 skipped (MySQL files need MySQL at localhost:3306) |
| fullstack/mongo | 28 passed |
| fullstack/node | 36 passed |
| fullstack/react | 41 files, 110 tests passed |
| fullstack/nextjs | 21 topics passed |
| fullstack/design | 39 passed |
| laravel | 301 tests, 956 assertions passed |

Infrastructure that can't run on one machine (sharding, Kafka, Kubernetes, Octane, Horizon) is a
small simulation or a config check, labelled as such in the file header and the folder README.
