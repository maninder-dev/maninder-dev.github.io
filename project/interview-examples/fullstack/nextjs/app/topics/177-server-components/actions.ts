'use server';
// Topic 177: a Server Action. The client gets only a reference id; calling it POSTs to the server.
const g = globalThis as unknown as { __cartCount?: number };

export async function addToCart(id: number) {
  if (!Number.isInteger(id) || id < 1) throw new Error('Invalid product id');
  g.__cartCount = (g.__cartCount ?? 0) + 1;
  return g.__cartCount;
}
