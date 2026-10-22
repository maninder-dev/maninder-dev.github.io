// Topic 171: What is Next.js and Why Use It?  (Full-Stack Handbook, Part 9)
// Run: npm run ex 171        (open: /topics/171-what-is-nextjs)
// What it shows: the folder-to-URL mapping of this very project, plus a route handler at /api/health.
export default function Page() {
  return (
    <main>
      <h1>Topic 171: What is Next.js?</h1>
      <p>
        Next.js is a React framework that adds file-based routing, server rendering, static generation,
        API endpoints, image and font optimisation, code splitting and caching. This project was written
        by hand (no create-next-app); the folders below are the routes.
      </p>
      <pre>{`app/
  layout.tsx                      <- root layout (html, body)
  page.tsx                        <- "/"
  topics/174-app-router/
    page.tsx                      <- "/topics/174-app-router"
    blog/[slug]/page.tsx          <- "/topics/174-app-router/blog/hello-world"
  api/health/route.ts             <- GET /api/health
pages/pr/179-blog.tsx             <- "/pr/179-blog" (Pages Router)`}</pre>
      <p>
        Try <a href="/api/health">/api/health</a>: a route handler returning JSON.
      </p>
    </main>
  );
}
