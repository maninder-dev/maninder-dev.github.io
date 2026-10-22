// Topic 179: Pages Router getStaticProps (SSG + ISR)  (Full-Stack Handbook, Part 9)
// Run: npm run ex 179        (open: /pr/179-blog)
// What it shows: props are computed at build time; revalidate: 5 regenerates the page in the
// background at most every 5 seconds (ISR). The generated-at time makes it visible.
import type { GetStaticProps } from 'next';
import { db, type Post } from '@/lib/db';

type Props = { posts: Post[]; generatedAt: string };

export const getStaticProps: GetStaticProps<Props> = async () => {
  const posts = await db.post.findMany(); // the PDF fetches a CMS; we read the in-memory db
  return {
    props: { posts, generatedAt: new Date().toISOString() },
    revalidate: 5, // ISR: regenerate at most once every 5 seconds
  };
};

export default function Blog({ posts, generatedAt }: Props) {
  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 820, margin: '0 auto', padding: '0 16px' }}>
      <h1>Topic 179: getStaticProps</h1>
      {posts.map((p) => <h2 key={p.slug}>{p.title}</h2>)}
      <p>Generated at: <code data-k="generated-at">{generatedAt}</code></p>
    </main>
  );
}
