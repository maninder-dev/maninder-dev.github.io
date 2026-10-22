// Topic 171: app/api/health/route.ts -> GET /api/health (a typical liveness endpoint).
export function GET() {
  return Response.json({ ok: true, uptime: Math.round(process.uptime()) });
}
