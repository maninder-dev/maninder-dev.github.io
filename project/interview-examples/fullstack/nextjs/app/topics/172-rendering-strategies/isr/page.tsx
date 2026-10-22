// Topic 172 (ISR): static HTML that is regenerated in the background at most every 5 seconds.
// Run: npm run ex 172        (open: /topics/172-rendering-strategies/isr)
// Stale-while-revalidate: the first request after the window still gets the old page and
// triggers a rebuild; the request after that sees the new time.
export const revalidate = 5;

export default function Page() {
  return (
    <main>
      <h1>ISR: revalidate = 5</h1>
      <p>Generated at: <code data-k="generated-at">{new Date().toISOString()}</code></p>
      <p>Reload quickly: same time. Wait 5+ seconds, reload twice: a newer time.</p>
    </main>
  );
}
