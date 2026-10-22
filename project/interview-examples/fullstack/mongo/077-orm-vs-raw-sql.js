// Topic 77: ORM vs Raw SQL - When to Use Which  (Full-Stack Handbook, Part 4)
// Run: npm run ex 77        (or: node 077-orm-vs-raw-sql.js)
// What it shows: everyday CRUD through Drizzle, then the handbook's monthly revenue report with
// DATE_TRUNC + LAG() OVER as parameterized raw SQL in the same codebase (Prisma's $queryRaw in comments).
import assert from 'node:assert/strict';
import { and, eq, sql } from 'drizzle-orm';
import { startPg, section } from './lib/db.js';
import { schema, orders, createTables } from './lib/pg-schema.js';

const pg = await startPg(schema);
const { db, client } = pg;
await createTables(client);

section('ORM for CRUD');
// await prisma.order.create({ data: { userId: 1, total: 499 } });
const [o] = await db.insert(orders).values({ userId: 1, status: 'pending', total: 499, createdAt: new Date(Date.UTC(2026, 6, 15)) }).returning();
await db.update(orders).set({ status: 'paid' }).where(eq(orders.id, o.id));
const [paid] = await db.select().from(orders).where(and(eq(orders.id, o.id), eq(orders.status, 'paid')));
assert.equal(paid.total, 499);
console.log('created + updated order', paid.id, paid.status);

// Seed 6 months of paid orders for the report.
const rows = [];
for (let m = 0; m < 6; m++) {
  for (let k = 0; k <= m; k++) rows.push({ userId: k + 1, status: 'paid', total: 100, createdAt: new Date(Date.UTC(2026, m, 10 + k)) });
}
rows.push({ userId: 9, status: 'cancelled', total: 10_000, createdAt: new Date(Date.UTC(2026, 2, 1)) });
await db.insert(orders).values(rows);

section('Raw SQL (still parameterized) for analytics');
/* Prisma equivalent:
   const report = await prisma.$queryRaw`SELECT DATE_TRUNC('month', created_at) AS month, ... WHERE status = ${status}`;
*/
const status = 'paid';
const since = new Date(Date.UTC(2026, 0, 1));
const report = await db.execute(sql`
  SELECT to_char(DATE_TRUNC('month', created_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
         SUM(total)::int AS revenue,
         LAG(SUM(total)::int) OVER (ORDER BY DATE_TRUNC('month', created_at AT TIME ZONE 'UTC')) AS prev
  FROM orders
  WHERE status = ${status} AND created_at >= ${since}
  GROUP BY 1, DATE_TRUNC('month', created_at AT TIME ZONE 'UTC')
  ORDER BY 1 DESC LIMIT 12`);
console.table(report.rows);
assert.deepEqual(report.rows[0], { month: '2026-07', revenue: 499, prev: 600 });
assert.deepEqual(report.rows[1], { month: '2026-06', revenue: 600, prev: 500 });
assert.equal(report.rows.at(-1).prev, null); // first month has no previous
assert.ok(!report.rows.some((r) => r.revenue > 1000), 'cancelled order filtered by the bound parameter');

section('Bulk update: one statement instead of loading rows into JS');
const res = await db.execute(sql`UPDATE orders SET status = 'archived' WHERE status = 'paid' AND created_at < ${new Date(Date.UTC(2026, 3, 1))}`);
console.log('archived', res.affectedRows, 'orders in one round trip');
assert.equal(res.affectedRows, 6);

await pg.stop();
console.log('\nOK');
