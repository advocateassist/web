// ── /api/healthz — Startup probe for Autoscale health checks ─────────────────
// Must return 200 with no authentication requirement.
// Configured as the startup probe path in artifact.toml.

export async function GET() {
  return Response.json({ ok: true });
}
