// Topic 185: webhook-style on-demand revalidation, protected by a shared secret header.
// POST /api/revalidate  with  x-secret: <REVALIDATE_SECRET>
import { revalidatePath, revalidateTag } from 'next/cache';

// Demo fallback so the example runs; set REVALIDATE_SECRET in real deployments.
const SECRET = process.env.REVALIDATE_SECRET ?? 'demo-revalidate-secret';

export async function POST(req: Request) {
  if (req.headers.get('x-secret') !== SECRET) {
    return Response.json({ error: 'Invalid secret' }, { status: 401 });
  }
  revalidateTag('products', { expire: 0 }); // next request blocks for fresh data (no stale serve)
  revalidateTag('counter', { expire: 0 });  // the tagged fetch in topic 183
  revalidatePath('/topics/185-on-demand-revalidation');
  return Response.json({ revalidated: true, now: Date.now() });
}
