// Topic 190: Authentication in Next.js  (Full-Stack Handbook, Part 9)
// Run: npm run ex 190        (open: /topics/190-authentication)
// What it shows: custom JWT auth with jose. POST /api/auth/login sets an httpOnly `session` cookie;
// lib/auth.ts getCurrentUser() verifies it in server code; admin/ requires role "admin" and
// redirects everyone else. proxy.ts (topic 188) adds a fast cookie-presence redirect on top.
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';

export default async function Page() {
  const user = await getCurrentUser();
  return (
    <main>
      <h1>Topic 190: Authentication</h1>
      <p>Current user: <code data-k="user">{user ? `${user.name} (${user.role})` : 'anonymous'}</code></p>
      <ul>
        <li><Link href="/topics/190-authentication/login">Log in</Link> (alice / alice123 is admin, bob / bob123 is a user)</li>
        <li><Link href="/topics/190-authentication/admin">Admin page</Link> (admins only)</li>
        <li><form action="/api/auth/logout" method="post"><button type="submit">Log out</button></form></li>
      </ul>
      <p className="note">The cookie is httpOnly (JavaScript cannot read it, so XSS cannot steal it), SameSite=Lax
        (basic CSRF protection) and signed (tampering invalidates it).</p>
    </main>
  );
}
