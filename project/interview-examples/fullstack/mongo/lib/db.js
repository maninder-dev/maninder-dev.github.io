// Shared helpers: start an in-process MongoDB (mongodb-memory-server) and PGlite + Drizzle.
// The first run downloads a mongod binary (~100 MB) into the user cache; later runs reuse it.
import { MongoMemoryServer, MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

/**
 * Start MongoDB and connect the native driver.
 *   replSet: false -> plain MongoMemoryServer (no oplog, no transactions)
 *   replSet: true  -> single-node replica set (oplog, change streams, transactions)
 *   replSet: 3     -> three local mongod processes in one replica set (real elections)
 *   args: extra mongod command-line args, e.g. ['--setParameter', 'ttlMonitorSleepSecs=1']
 */
export async function startMongo({ replSet = false, args = [], dbName = 'shop', clientOptions = {} } = {}) {
  let server;
  if (replSet) {
    server = await MongoMemoryReplSet.create({
      replSet: { count: replSet === true ? 1 : replSet, storageEngine: 'wiredTiger', args },
    });
  } else {
    server = await MongoMemoryServer.create({ instance: { storageEngine: 'wiredTiger', args } });
  }
  const uri = server.getUri();
  const client = await new MongoClient(uri, clientOptions).connect();
  const db = client.db(dbName);
  return {
    server, client, db, uri,
    async stop() {
      await client.close();
      await server.stop();
    },
  };
}

/** Run main(ctx) with a fresh MongoDB and always tear it down. */
export async function withMongo(opts, main) {
  const ctx = await startMongo(opts);
  try {
    await main(ctx);
  } finally {
    await ctx.stop();
  }
}

/** PGlite (PostgreSQL compiled to WASM, in-process) wrapped by Drizzle, with a query log. */
export async function startPg(schema = {}) {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const client = new PGlite();
  const queries = [];
  const logger = { logQuery: (sql, params) => queries.push({ sql, params }) };
  const db = drizzle({ client, schema, logger });
  return {
    db, client, queries,
    /** Count queries run while fn executes. */
    async count(fn) {
      const start = queries.length;
      const result = await fn();
      return { result, n: queries.length - start, sql: queries.slice(start).map((q) => q.sql) };
    },
    stop: () => client.close(),
  };
}

export const section = (title) => console.log(`\n--- ${title} ---`);

/** Flatten an explain("executionStats") result: stage chain plus the three key counters. */
export function planSummary(explain) {
  const wp = explain.queryPlanner.winningPlan;
  const stages = [];
  const walk = (s) => {
    if (!s) return;
    stages.push(s.stage);
    walk(s.inputStage);
    (s.inputStages ?? []).forEach(walk);
  };
  walk(wp.queryPlan ?? wp);
  const es = explain.executionStats;
  return {
    stages: stages.join(' <- '),
    keysExamined: es.totalKeysExamined,
    docsExamined: es.totalDocsExamined,
    nReturned: es.nReturned,
  };
}

/** Start MongoDB, connect Mongoose to it, run main({ mongoose, ...ctx }), tear everything down. */
export async function withMongoose(opts, main) {
  const { default: mongoose } = await import('mongoose');
  await withMongo(opts, async (ctx) => {
    await mongoose.connect(ctx.uri, { dbName: opts.dbName ?? 'shop' });
    try {
      await main({ mongoose, ...ctx });
    } finally {
      await mongoose.disconnect();
    }
  });
}
