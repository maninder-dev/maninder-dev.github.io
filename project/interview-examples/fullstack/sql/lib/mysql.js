// MySQL helper: runs against a real server at localhost:3306 if one is reachable,
// otherwise prints the SQL with an explanation and a SKIPPED line (exit code 0).
import mysql from 'mysql2/promise';

export const MYSQL_DB = 'interview_examples';

export async function withMysql({ sql, notes }, fn) {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: '127.0.0.1', port: 3306, user: 'root', password: '', connectTimeout: 1500,
    });
  } catch (err) {
    console.log('MySQL SQL for this topic:\n');
    console.log(sql.trim().split('\n').map((l) => '    ' + l).join('\n'));
    console.log('\nWhat it would show:\n' + notes.trim().split('\n').map((l) => '  ' + l).join('\n'));
    console.log(`\nSKIPPED: no MySQL at localhost:3306 (${err.code ?? err.message})`);
    return;
  }
  try {
    await conn.query(`DROP DATABASE IF EXISTS ${MYSQL_DB}`);
    await conn.query(`CREATE DATABASE ${MYSQL_DB}`);
    await conn.query(`USE ${MYSQL_DB}`);
    const open = () => mysql.createConnection({ host: '127.0.0.1', port: 3306, user: 'root', password: '', database: MYSQL_DB });
    await fn(conn, open);
  } finally {
    await conn.query(`DROP DATABASE IF EXISTS ${MYSQL_DB}`).catch(() => {});
    await conn.end();
  }
}

export const q = async (conn, sql, params) => (await conn.query(sql, params))[0];
