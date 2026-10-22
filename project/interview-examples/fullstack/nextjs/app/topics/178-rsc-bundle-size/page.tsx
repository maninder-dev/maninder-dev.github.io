// Topic 178: RSC Benefits: Bundle Size  (Full-Stack Handbook, Part 9)
// Run: npm run ex 178        (open: /topics/178-rsc-bundle-size)
// What it shows: `marked` (a markdown parser, ~40 KB) is used only in this Server Component, so the
// browser receives finished HTML and 0 KB of marked. The check script greps .next/static to prove it.
// (The PDF also uses highlight.js; left out to keep dependencies small, the principle is the same.)
import { marked } from 'marked';

const doc = `## Why Server Components?

- **Zero** client JavaScript for server-only libraries
- No client-server waterfalls
- Secrets stay on the server`;

export default async function Doc() {
  const html = await marked.parse(doc); // trusted, hard-coded content only
  return (
    <main>
      <h1>Topic 178: RSC bundle size</h1>
      <article dangerouslySetInnerHTML={{ __html: html }} />
      <p className="note">Never pass untrusted markdown to dangerouslySetInnerHTML without sanitising it.</p>
    </main>
  );
}
