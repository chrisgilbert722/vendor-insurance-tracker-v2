// pages/api/requirements/check.js
import { Client } from "pg";

export default async function handler(req, res) {
  const { vendorId } = req.query;
  const vId = parseInt(vendorId, 10);

  if (Number.isNaN(vId)) {
    return res.status(400).json({ ok: false, error: "Invalid vendorId." });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // Load requirements (org-wide for now)
    const reqRes = await client.query(
      `SELECT id, coverage_type, minimum_limit, required
       FROM public.requirements
       ORDER BY id ASC`
    );

    const requirements = reqRes.rows || [];

    // Load vendor policies
    const polRes = await client.query(
      `SELECT id, coverage_type, expiration_date, status
       FROM public.policies
       WHERE vendor_id = $1`,
      [vId]
    );

    const policies = polRes.rows || [];

    // Build coverage set
    const coverageSet = new Set(
      policies
        .map((p) => (p.coverage_type || "").toLowerCase())
        .filter((s) => s.length > 0)
    );

    const missing = [];
    const present = [];

    for (const rule of requirements) {
      const ruleKey = (rule.coverage_type || "").toLowerCase();
      if (!ruleKey) continue;

      const found = Array.from(coverageSet).some((c) => c.includes(ruleKey));

      if (found) {
        present.push(rule);
      } else if (rule.required) {
        missing.push(rule);
      }
    }

    return res.status(200).json({
      ok: true,
      requirements,
      missing,
      present,
      vendorId: vId,
    });
  } catch (err) {
    console.error("requirements/check error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Check failed" });
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}
