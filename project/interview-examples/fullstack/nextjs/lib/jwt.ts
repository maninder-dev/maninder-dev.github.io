// Topic 190 helper: sign and verify the session JWT with jose (HS256).
// Used by route handlers, Server Components and the Pages Router (getServerSideProps), so it does
// not import 'server-only' (that package only resolves in the App Router's server build).
import { SignJWT, jwtVerify } from 'jose';

export type Session = { sub: string; role: 'admin' | 'user'; name: string };

// Demo fallback so the example runs out of the box; set JWT_SECRET in real deployments.
const key = () => new TextEncoder().encode(process.env.JWT_SECRET ?? 'demo-only-jwt-secret-please-change-0123456789');

export async function signSession(s: Session) {
  return new SignJWT({ role: s.role, name: s.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(s.sub)
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    return { sub: String(payload.sub), role: payload.role === 'admin' ? 'admin' : 'user', name: String(payload.name) };
  } catch {
    return null; // bad signature, expired or malformed
  }
}
