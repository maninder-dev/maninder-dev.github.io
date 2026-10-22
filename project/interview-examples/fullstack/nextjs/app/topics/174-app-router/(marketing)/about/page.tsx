// Topic 174: route group. The folder "(marketing)" organises files (and could hold its own
// layout.tsx) without adding a URL segment: this page is /topics/174-app-router/about.
// Run: npm run ex 174
export default function About() {
  return (
    <main>
      <h1>About (inside a route group)</h1>
      <p>File: app/topics/174-app-router/(marketing)/about/page.tsx. URL: /topics/174-app-router/about.</p>
    </main>
  );
}
