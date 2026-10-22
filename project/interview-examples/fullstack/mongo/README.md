# MongoDB, ORM and ODM examples (Full-Stack Handbook topics 57-86, 218)

Runnable examples for Part 3 (MongoDB), Part 4 (ORM and ODM) and question 218.

- **MongoDB**: real `mongod` processes started by
  [mongodb-memory-server](https://github.com/typegoose/mongodb-memory-server), using the native
  driver. Plain `MongoMemoryServer` by default; a single-node replica set where a topic needs the
  oplog, change streams or transactions; three members for the failover demo (70).
- **ODM**: Mongoose.
- **SQL ORM**: Drizzle ORM on [PGlite](https://pglite.dev) (PostgreSQL compiled to WASM, in-process).
  Sequelize, Prisma and TypeORM equivalents are shown as comments rather than installed.

The first run downloads a `mongod` binary (~100 MB) into the cache; later runs reuse it. The
version is pinned to **7.0.14** in `package.json` (`config.mongodbMemoryServer.version`) because
the default 8.2 Windows binary crashed with an illegal-instruction fault on the test machine during
replica-set start-up. Override with `MONGOMS_VERSION=...` if you need another one.

```
npm install
npm run ex 63     # run the file(s) for one topic
npm test          # run every example, one PASS/FAIL line per file
```

Shared helpers: `lib/db.js` (start/stop MongoDB, Mongoose, PGlite + Drizzle with a query
counter, explain() summary) and `lib/pg-schema.js` (Drizzle schema used by the SQL ORM topics).

| Topic | Title | File | Run |
|---|---|---|---|
| 57 | What is MongoDB? | [057-058-mongodb-basics.js](057-058-mongodb-basics.js) | `npm run ex 57` |
| 58 | Why MongoDB over SQL? | [057-058-mongodb-basics.js](057-058-mongodb-basics.js) | `npm run ex 58` |
| 59 | BSON vs JSON | [059-bson-vs-json.js](059-bson-vs-json.js) | `npm run ex 59` |
| 60 | Documents vs Collections | [060-documents-vs-collections.js](060-documents-vs-collections.js) | `npm run ex 60` |
| 61 | Schema-less vs Schema-flexible | [061-schema-validation.js](061-schema-validation.js) | `npm run ex 61` |
| 62 | How MongoDB Stores Data Internally | [062-storage-internals.js](062-storage-internals.js) | `npm run ex 62` |
| 63 | Indexing in MongoDB | [063-indexing.js](063-indexing.js) | `npm run ex 63` |
| 64 | What is WiredTiger? | [064-065-wiredtiger-and-memory.js](064-065-wiredtiger-and-memory.js) | `npm run ex 64` |
| 65 | How MongoDB Handles Memory | [064-065-wiredtiger-and-memory.js](064-065-wiredtiger-and-memory.js) | `npm run ex 65` |
| 66 | What is the Oplog? | [066-oplog-change-streams.js](066-oplog-change-streams.js) | `npm run ex 66` |
| 67 | CRUD Operators You Must Know | [067-crud-operators.js](067-crud-operators.js) | `npm run ex 67` |
| 68 | Aggregation Pipeline | [068-aggregation-pipeline.js](068-aggregation-pipeline.js) | `npm run ex 68` |
| 69 | Query Optimization with explain() | [069-explain.js](069-explain.js) | `npm run ex 69` |
| 70 | Replica Sets (Reliability) | [070-replica-sets.js](070-replica-sets.js) | `npm run ex 70` |
| 71 | Sharding (Scaling) - simulation | [071-sharding-simulation.js](071-sharding-simulation.js) | `npm run ex 71` |
| 72 | Transactions in MongoDB | [072-transactions.js](072-transactions.js) | `npm run ex 72` |
| 73 | Data Modeling: Embedding vs Referencing | [073-embedding-vs-referencing.js](073-embedding-vs-referencing.js) | `npm run ex 73` |
| 74 | What is an ORM? | [074-what-is-an-orm.js](074-what-is-an-orm.js) | `npm run ex 74` |
| 75 | What is an ODM? | [075-what-is-an-odm.js](075-what-is-an-odm.js) | `npm run ex 75` |
| 76 | Pros and Cons of ORMs | [076-orm-pros-and-cons.js](076-orm-pros-and-cons.js) | `npm run ex 76` |
| 77 | ORM vs Raw SQL - When to Use Which | [077-orm-vs-raw-sql.js](077-orm-vs-raw-sql.js) | `npm run ex 77` |
| 78 | How ORMs Work Internally | [078-how-orms-work.js](078-how-orms-work.js) | `npm run ex 78` |
| 79 | Migrations | [079-migrations.js](079-migrations.js) | `npm run ex 79` |
| 80 | Lazy vs Eager Loading | [080-081-lazy-eager-n-plus-1.js](080-081-lazy-eager-n-plus-1.js) | `npm run ex 80` |
| 81 | The N+1 Problem in ORMs | [080-081-lazy-eager-n-plus-1.js](080-081-lazy-eager-n-plus-1.js) | `npm run ex 81` |
| 82 | Over-fetching and Selecting Fields | [082-select-fields.js](082-select-fields.js) | `npm run ex 82` |
| 83 | Transactions with ORMs | [083-orm-transactions.js](083-orm-transactions.js) | `npm run ex 83` |
| 84 | Connection Pooling in ORMs | [084-connection-pooling.js](084-connection-pooling.js) | `npm run ex 84` |
| 85 | Mongoose Deep Dive: Populate, Virtuals, Middleware | [085-mongoose-deep-dive.js](085-mongoose-deep-dive.js) | `npm run ex 85` |
| 86 | Sequelize vs Prisma vs TypeORM vs Drizzle | [086-orm-comparison.js](086-orm-comparison.js) | `npm run ex 86` |
| 218 | MongoDB and ORM Questions | [218-mongodb-orm-questions.js](218-mongodb-orm-questions.js) | `npm run ex 218` |

Notes on what is simulated or reduced:

- **71 Sharding** is a simulation: a sharded cluster (config servers, mongos, several shard
  replica sets) can't run on one machine, so the file models mongos routing (hashed vs range shard
  keys, the hot shard from a monotonic key, targeted vs scatter-gather queries).
- **70 Replica sets** run three real `mongod` processes with real elections, but on one machine,
  so there is no network partition.
- **79 Migrations** uses a hand-written runner (up/down, a `schema_migrations` table, one
  transaction per migration); drizzle-kit / Prisma / Sequelize CLI commands are in comments.
- **80 Lazy loading**: Drizzle has no lazy proxies, so a `getPosts()` accessor mimics Sequelize's.
- **84 Pooling** is shown with the MongoDB driver's pool (the one Mongoose uses), because PGlite is
  a single in-process connection.
- **74, 76, 77, 83, 86**: Sequelize, Prisma and TypeORM code is shown in comments, not installed.
- **75** hashes passwords with `node:crypto` scrypt instead of bcrypt (no native build step).
