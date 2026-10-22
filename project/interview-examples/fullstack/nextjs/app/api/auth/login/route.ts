// Topic 190: POST /api/auth/login. Accepts a JSON body or an HTML form. On success it sets the
// signed JWT in an httpOnly cookie; a form post is then redirected (303) back to `from`.
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { signSession } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  const isJson = req.headers.get('content-type')?.includes('application/json');
  const input: Record<string, unknown> = isJson
    ? await req.json().catch(() => ({}))
    : Object.fromEntries(await req.formData().catch(() => new FormData()));
  const username = String(input.username ?? '');
  const password = String(input.password ?? '');
  const fromRaw = String(input.from ?? '/topics/190-authentication');
  const from = fromRaw.startsWith('/') && !fromRaw.startsWith('//') ? fromRaw : '/'; // no open redirects

  const user = await db.user.findByUsername(username);
  if (!user || user.password !== password) { // demo only: compare password hashes in real code
    if (isJson) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    return NextResponse.redirect(new URL(`/topics/190-authentication/login?error=1&from=${encodeURIComponent(from)}`, req.url), 303);
  }

  const token = await signSession({ sub: user.id, role: user.role, name: user.name });
  const res = isJson
    ? NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } })
    : NextResponse.redirect(new URL(from, req.url), 303);
  res.cookies.set('session', token, {
    httpOnly: true,                                    // not readable from document.cookie
    sameSite: 'lax',
    secure: req.nextUrl.protocol === 'https:',         // always true in production over HTTPS
    path: '/',
    maxAge: 60 * 60 * 2,
  });
  return res;
}
