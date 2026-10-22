// Topic 190: the real authorization check, in server code. Anyone who is not an admin
// (no cookie, bad signature, role "user") is redirected (HTTP 307) to the login page.
// Run: npm run ex 190        (open: /topics/190-authentication/admin)
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (user?.role !== 'admin') redirect('/topics/190-authentication/login?from=/topics/190-authentication/admin');
  return (
    <main>
      <h1>Admin</h1>
      <p>Welcome, {user.name}. Only role=admin gets here.</p>
    </main>
  );
}
