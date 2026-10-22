// Topics 183/184: stands in for an external API. Every real hit increments a counter per ?key=,
// so pages can tell whether their fetch() was served from a cache or actually ran.
import type { NextRequest } from 'next/server';

const g = globalThis as unknown as { __counterHits?: Record<string, number> };
const hits = (g.__counterHits ??= {});

export function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') ?? 'default';
  hits[key] = (hits[key] ?? 0) + 1;
  return Response.json({ key, count: hits[key], at: new Date().toISOString() });
}
