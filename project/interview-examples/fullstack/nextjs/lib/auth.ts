// Topic 190: read the httpOnly session cookie in App Router server code (the PDF's getCurrentUser).
import 'server-only';
import { cookies } from 'next/headers';
import { verifySession } from './jwt';

export async function getCurrentUser() {
  const token = (await cookies()).get('session')?.value;
  return verifySession(token);
}
