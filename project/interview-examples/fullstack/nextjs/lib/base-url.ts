// Server Components that fetch the app's own route handlers need an absolute URL.
// Reading headers() also makes the page dynamic, which we need: no server is running at build time.
import { headers } from 'next/headers';

export async function baseUrl() {
  const h = await headers();
  return `http://${h.get('host')}`;
}
