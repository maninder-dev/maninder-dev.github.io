// Topic 188: Next.js Middleware  (Full-Stack Handbook, Part 9)
// Run: npm run ex 188
// What it shows: Next 16 renamed middleware.ts to proxy.ts (and the export to `proxy`); the code is
// the PDF's middleware otherwise. It runs before every matched request and does three things:
//   1. auth redirect: /topics/188-*/dashboard without a session cookie -> login page (?from=...)
//   2. A/B test: /topics/188-middleware/pricing is rewritten to pricing/a or pricing/b (sticky cookie)
//   3. adds an x-request-id header to the response and forwards it to the page.
// It only checks that a cookie exists (fast, optimistic); pages re-verify the JWT themselves.
import { NextResponse, type NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  const withId = <T extends NextResponse>(res: T) => { res.headers.set('x-request-id', requestId); return res; };

  // 1. Protect private routes
  if (/^\/topics\/188-[^/]+\/dashboard(\/|$)/.test(pathname) && !req.cookies.get('session')) {
    const url = new URL('/topics/190-authentication/login', req.url);
    url.searchParams.set('from', pathname);
    return withId(NextResponse.redirect(url));
  }

  // Forward the id to Server Components as a request header (read with headers()).
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-request-id', requestId);

  // 2. A/B test via rewrite: the URL in the browser stays /pricing
  if (pathname === '/topics/188-middleware/pricing') {
    const existing = req.cookies.get('ab')?.value;
    const bucket = existing === 'a' || existing === 'b' ? existing : Math.random() < 0.5 ? 'a' : 'b';
    const res = NextResponse.rewrite(new URL(`/topics/188-middleware/pricing/${bucket}`, req.url), {
      request: { headers: requestHeaders },
    });
    if (!existing) res.cookies.set('ab', bucket, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
    return withId(res);
  }

  // 3. Add headers
  return withId(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  // Everything except static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|hero.png).*)'],
};
