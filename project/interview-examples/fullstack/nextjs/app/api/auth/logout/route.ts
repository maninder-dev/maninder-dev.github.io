// Topic 190: POST /api/auth/logout clears the session cookie.
import { NextResponse, type NextRequest } from 'next/server';

export function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/topics/190-authentication', req.url), 303);
  res.cookies.delete('session');
  return res;
}
