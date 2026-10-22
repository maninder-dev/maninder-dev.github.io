// Topic 174: dynamic segment. Since Next 15, params is a Promise and must be awaited.
// Run: npm run ex 174        (open: /topics/174-app-router/blog/hello-world)
// generateStaticParams prebuilds every known slug at build time (the App Router's getStaticPaths);
// dynamicParams = false turns any other slug into a 404 instead of rendering it on demand.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  const posts = await db.post.findMany();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.post.findBySlug(slug);
  return { title: post ? post.title : 'Not found' };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = await db.post.findBySlug(slug);
  if (!post) notFound();
  return (
    <main>
      <article>
        <h1>{post.title}</h1>
        <p>{post.body}</p>
      </article>
      <p>Prebuilt at: <code data-k="generated-at">{new Date().toISOString()}</code></p>
    </main>
  );
}
