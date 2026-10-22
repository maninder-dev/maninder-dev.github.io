// Topic 181: getStaticPaths (Dynamic SSG)  (Full-Stack Handbook, Part 9)
// Run: npm run ex 181        (open: /pr/181-products/1)
// What it shows: products 1 and 2 are prebuilt at build time (.next/server/pages/pr/181-products/1.html);
// fallback: 'blocking' renders other ids on their first visit and caches them; unknown ids -> 404.
// App Router equivalent: generateStaticParams (see topic 174).
import type { GetStaticPaths, GetStaticProps } from 'next';
import { db, type Product } from '@/lib/db';

type Props = { product: Product; generatedAt: string };

export const getStaticPaths: GetStaticPaths = async () => {
  const top = (await db.product.findMany()).slice(0, 2); // "the most popular" products
  return {
    paths: top.map((p) => ({ params: { id: String(p.id) } })),
    fallback: 'blocking', // false -> 404 for unknown; true -> show a loading state first
  };
};

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const product = await db.product.findUnique(Number(params?.id));
  return product
    ? { props: { product, generatedAt: new Date().toISOString() }, revalidate: 300 }
    : { notFound: true };
};

export default function ProductPage({ product, generatedAt }: Props) {
  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 820, margin: '0 auto', padding: '0 16px' }}>
      <h1>Topic 181: {product.name}</h1>
      <p>Rs. {product.price}</p>
      <p>Generated at: <code data-k="generated-at">{generatedAt}</code></p>
    </main>
  );
}
