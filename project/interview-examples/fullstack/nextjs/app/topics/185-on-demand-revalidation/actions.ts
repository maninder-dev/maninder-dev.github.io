'use server';
// Topic 185: Server Action that writes, then invalidates. In Next 16, updateTag() is the
// Server-Action-only "read your own writes" form of revalidateTag(): the next render waits for
// fresh data instead of serving stale. revalidatePath drops this page's cached HTML.
import { revalidatePath, updateTag } from 'next/cache';
import { db } from '@/lib/db';

export async function updatePrice(formData: FormData) {
  const id = Number(formData.get('id'));
  const price = Number(formData.get('price'));
  if (!Number.isInteger(id) || !Number.isInteger(price) || price <= 0) return; // validate: it is a public endpoint
  await db.product.update(id, { price });
  updateTag('products');
  revalidatePath('/topics/185-on-demand-revalidation');
}
