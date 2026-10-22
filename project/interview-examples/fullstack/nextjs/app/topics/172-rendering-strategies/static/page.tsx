// Topic 172 (SSG): rendered once by `next build`; every request gets the same HTML.
// Run: npm run ex 172        (open: /topics/172-rendering-strategies/static)
export const dynamic = 'force-static';

export default function Page() {
  return (
    <main>
      <h1>SSG: static page</h1>
      <p>Generated at: <code data-k="generated-at">{new Date().toISOString()}</code></p>
      <p>This time is the build time. Reloading never changes it until the next build.</p>
    </main>
  );
}
