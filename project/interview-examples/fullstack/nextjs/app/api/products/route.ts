// Topic 187: Route Handlers. GET /api/products?q=  and  POST /api/products (JSON body).
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  return Response.json(await db.product.findMany(q));
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { name, price } = (body ?? {}) as { name?: unknown; price?: unknown };
  const errors: string[] = [];
  if (typeof name !== 'string' || name.trim().length < 2) errors.push('name must be at least 2 characters');
  if (typeof price !== 'number' || !Number.isInteger(price) || price <= 0) errors.push('price must be a positive integer');
  if (errors.length) return Response.json({ errors }, { status: 400 }); // validate first!
  const product = await db.product.create({ name: (name as string).trim(), price: price as number });
  return Response.json(product, { status: 201 });
}
