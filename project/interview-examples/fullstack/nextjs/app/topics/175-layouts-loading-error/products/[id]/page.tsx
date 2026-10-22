// Topic 175: notFound() renders the nearest not-found.tsx and sets HTTP 404.
// Run: npm run ex 175        (open: /topics/175-layouts-loading-error/products/999)
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';

export default async function Product({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique(Number(id));
  if (!product) notFound();
  return <h2>{product.name}: Rs. {product.price}</h2>;
}
