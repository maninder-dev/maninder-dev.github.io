// Topic 52: Slow Query Log  (Full-Stack Handbook, Part 2)
// Run: npm run ex 52       (or: node 052-mysql-slow-query-log.js)
// What it shows: turning on the slow query log (written to the mysql.slow_log TABLE so we can read
// it back), running a slow query, finding it in the log, then restoring the server's settings.
// Needs MySQL at localhost:3306 with root, else SKIPPED (095-detecting-slow-queries.js covers PostgreSQL).
import assert from 'node:assert/strict';
import { heading, show } from './lib/db.js';
import { withMysql, q } from './lib/mysql.js';

await withMysql({
  sql: `
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;                       -- seconds
SET GLOBAL log_queries_not_using_indexes = 'ON';
SHOW VARIABLES LIKE 'slow_query_log_file';
# Summarise the log: top 10 queries by total time
mysqldumpslow -s t -t 10 /var/lib/mysql/host-slow.log
pt-query-digest /var/lib/mysql/host-slow.log`,
  notes: `
Every statement slower than long_query_time is written with its query time, rows examined and
rows sent. "Rows examined" far above "rows sent" points at a missing index.
PostgreSQL equivalent: log_min_duration_statement = 1000 plus pg_stat_statements.`,
}, async (conn) => {
  const saved = (await q(conn, 'SELECT @@GLOBAL.slow_query_log AS s, @@GLOBAL.log_output AS o'))[0];
  try {
    await conn.query(`SET GLOBAL log_output = 'TABLE'`);
    await conn.query(`SET GLOBAL slow_query_log = 'ON'`);
    await conn.query('SET SESSION long_query_time = 0.1');
    heading('Run a slow query');
    await conn.query(`SELECT SLEEP(0.3) AS slow_marker_interview_examples`);
    const rows = await q(conn, `SELECT query_time, rows_examined, sql_text FROM mysql.slow_log
                                WHERE CONVERT(sql_text USING utf8mb4) LIKE '%slow_marker_interview_examples%'
                                  AND CONVERT(sql_text USING utf8mb4) NOT LIKE '%mysql.slow_log%'`);
    show('found in mysql.slow_log', rows.map((r) => ({ ...r, sql_text: String(r.sql_text) })));
    assert.ok(rows.length >= 1);
  } finally {
    await conn.query(`SET GLOBAL slow_query_log = ${saved.s ? 1 : 0}`);
    await conn.query(`SET GLOBAL log_output = '${saved.o}'`);
  }
});
console.log('\nOK');
