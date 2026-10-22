// Shared helpers: an in-process PostgreSQL (PGlite) plus small printing utilities.
import { PGlite } from '@electric-sql/pglite';

export async function createDb(options) {
  const db = new PGlite(options);
  await db.waitReady;
  return db;
}

export const all = async (db, sql, params) => (await db.query(sql, params)).rows;
export const one = async (db, sql, params) => (await db.query(sql, params)).rows[0];

// EXPLAIN output as one string. opts e.g. 'ANALYZE, BUFFERS' or 'COSTS OFF'.
export async function explain(db, sql, opts = 'COSTS OFF') {
  const r = await db.query(`EXPLAIN (${opts}) ${sql}`);
  return r.rows.map((row) => row['QUERY PLAN']).join('\n');
}

export function heading(text) {
  console.log(`\n--- ${text}`);
}

export function show(label, value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  console.log(text.includes('\n') ? `${label}:\n${indent(text)}` : `${label}: ${text}`);
}

export const indent = (text, pad = '    ') => text.split('\n').map((l) => pad + l).join('\n');

// Average wall time in ms over `reps` runs of an async function.
export async function timeIt(fn, reps = 1) {
  const start = performance.now();
  for (let i = 0; i < reps; i++) await fn();
  return (performance.now() - start) / reps;
}

// Run fn and return the Postgres error it throws (or fail if it doesn't throw).
export async function expectPgError(fn, code) {
  try {
    await fn();
  } catch (err) {
    if (code && err.code !== code) throw err;
    return err;
  }
  throw new Error(`expected SQLSTATE ${code ?? '(any)'} but the statement succeeded`);
}
