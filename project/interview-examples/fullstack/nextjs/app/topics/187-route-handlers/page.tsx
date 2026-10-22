// Topic 187: Route Handlers (API Routes)  (Full-Stack Handbook, Part 9)
// Run: npm run ex 187        (open: /topics/187-route-handlers)
// What it shows: app/api/products/route.ts (GET with ?q=, POST with validation -> 201/400) and
// app/api/products/[id]/route.ts (GET, PATCH, DELETE -> 204/404). The check script calls them.
export default function Page() {
  return (
    <main>
      <h1>Topic 187: Route Handlers</h1>
      <p>Export functions named after HTTP methods from a <code>route.ts</code>. They receive a standard
        <code> Request</code> (or <code>NextRequest</code>) and return a <code>Response</code>.</p>
      <pre>{`curl "http://localhost:3000/api/products?q=key"
curl -X POST -H "content-type: application/json" -d '{"name":"Webcam","price":3200}' http://localhost:3000/api/products
curl -X POST -H "content-type: application/json" -d '{"name":""}' http://localhost:3000/api/products   # 400
curl -X DELETE http://localhost:3000/api/products/1000                                                  # 204 / 404`}</pre>
      <p>Try <a href="/api/products?q=key">/api/products?q=key</a>.</p>
    </main>
  );
}
