// Topic 188: protected page. proxy.ts redirects when there is no cookie at all; this page still
// verifies the JWT itself, because a forged or expired cookie gets past the proxy's presence check.
// Run: npm run ex 188        (open: /topics/188-middleware/dashboard)
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/topics/190-authentication/login?from=/topics/188-middleware/dashboard');
  const requestId = (await headers()).get('x-request-id');
  return (
    <main>
      <h1>Dashboard for {user.name}</h1>
      <p>Request id: <code data-k="request-id">{requestId}</code></p>
    </main>
  );
}
