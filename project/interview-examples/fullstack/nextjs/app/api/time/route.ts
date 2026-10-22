// Topic 172 (CSR data source): GET route handlers are not cached by default since Next 15.
export function GET() {
  return Response.json({ now: new Date().toISOString() });
}
