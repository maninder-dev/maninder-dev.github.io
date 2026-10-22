// Topic 175: a page whose data source fails on every other request, caught by flaky/error.tsx.
// Run: npm run ex 175        (open: /topics/175-layouts-loading-error/flaky)
// Clicking "Try again" (reset + router.refresh) re-renders on the server, which then succeeds.
import { connection } from 'next/server';

const g = globalThis as unknown as { __flakyCalls?: number };

async function loadDashboard() {
  g.__flakyCalls = (g.__flakyCalls ?? 0) + 1;
  if (g.__flakyCalls % 2 === 1) throw new Error('Upstream timed out');
  return { attempt: g.__flakyCalls };
}

export default async function Flaky() {
  await connection();
  const data = await loadDashboard();
  return <h2>Dashboard loaded on attempt {data.attempt}</h2>;
}
