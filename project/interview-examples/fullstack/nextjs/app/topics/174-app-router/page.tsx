// Topic 174: The App Router (Next.js 13+)  (Full-Stack Handbook, Part 9)
// Run: npm run ex 174        (open: /topics/174-app-router)
// What it shows: a route group "(marketing)" that is not part of the URL, and a dynamic segment
// blog/[slug] with awaited params, generateStaticParams and generateMetadata.
import Link from 'next/link';

export default function Page() {
  return (
    <main>
      <h1>Topic 174: The App Router</h1>
      <p>Folders define routes; special files (page, layout, loading, error, not-found, route) define UI.
        Components are Server Components unless marked <code>&apos;use client&apos;</code>.</p>
      <pre>{`app/topics/174-app-router/
  page.tsx                     /topics/174-app-router
  (marketing)/about/page.tsx   /topics/174-app-router/about   <- "(marketing)" not in URL
  blog/[slug]/page.tsx         /topics/174-app-router/blog/hello-world`}</pre>
      <ul>
        <li><Link href="/topics/174-app-router/about">About (route group)</Link></li>
        <li><Link href="/topics/174-app-router/blog/hello-world">Blog: hello-world</Link></li>
        <li><Link href="/topics/174-app-router/blog/nextjs-caching">Blog: nextjs-caching</Link></li>
        <li><Link href="/topics/174-app-router/blog/missing">Blog: missing (404, dynamicParams = false)</Link></li>
      </ul>
    </main>
  );
}
