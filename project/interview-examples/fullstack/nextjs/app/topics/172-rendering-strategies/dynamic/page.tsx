// Topic 172 (SSR): rendered on the server for every request.
// Run: npm run ex 172        (open: /topics/172-rendering-strategies/dynamic)
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <main>
      <h1>SSR: dynamic page</h1>
      <p>Generated at: <code data-k="generated-at">{new Date().toISOString()}</code></p>
      <p>Different on every reload: the HTML is built per request.</p>
    </main>
  );
}
