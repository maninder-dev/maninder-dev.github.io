// Topic 187: dynamic route handler. GET / PATCH / DELETE /api/products/:id
// PATCH deliberately does not revalidate anything: topic 185 uses it to show stale cached data.
import { db } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const product = await db.product.findUnique(Number((await params).id));
  return product ? Response.json(product) : Response.json({ error: 'Not found' }, { status: 404 });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { price } = (await req.json().catch(() => ({}))) as { price?: unknown };
  if (typeof price !== 'number' || price <= 0) return Response.json({ error: 'price required' }, { status: 400 });
  const product = await db.product.update(Number((await params).id), { price });
  return product ? Response.json(product) : Response.json({ error: 'Not found' }, { status: 404 });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const ok = await db.product.delete(Number((await params).id));
  return ok ? new Response(null, { status: 204 }) : Response.json({ error: 'Not found' }, { status: 404 });
}
