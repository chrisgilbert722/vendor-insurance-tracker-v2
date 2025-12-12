// pages/api/telemetry/event.js
// Safe telemetry endpoint (never breaks build if table/db missing)

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok: false });

    const body = req.body || {};
    const payload = {
      event: String(body.event || "unknown"),
      page: String(body.page || ""),
      stepId: body.stepId ? String(body.stepId) : null,
      stepIndex: Number.isFinite(body.stepIndex) ? body.stepIndex : null,
      meta: body.meta && typeof body.meta === "object" ? body.meta : {},
      ts: new Date().toISOString(),
    };

    // OPTIONAL DB INSERT (wrapped so it never breaks anything)
    try {
      const { sql } = await import("../../../lib/db");
      await sql`
        INSERT INTO telemetry_events (event, page, step_id, step_index, meta)
        VALUES (${payload.event}, ${payload.page}, ${payload.stepId}, ${payload.stepIndex}, ${payload.meta});
      `;
    } catch (e) {
      // Ignore db/table errors — still succeed
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(200).json({ ok: true });
  }
}
