// pages/api/requirements/index.js
import { Client } from "pg";

export default async function handler(req, res) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    if (req.method === "GET") {
      // For now: org_id is ignored / single-org
      const result = await client.query(
        `SELECT id, org_id, coverage_type, minimum_limit, required, created_at
         FROM public.requirements
         ORDER BY created_at ASC`
      );

      return res.status(200).json({ ok: true, requirements: result.rows });
    }

    if (req.method === "POST") {
      const { coverage_type, minimum_limit, required } = req.body;

      if (!coverage_type || typeof coverage_type !== "string") {
        return res
          .status(400)
          .json({ ok: false, error: "coverage_type is required." });
      }

      const minLimitParsed =
        typeof minimum_limit === "number"
          ? minimum_limit
          : minimum_limit
          ? parseInt(minimum_limit, 10)
          : null;

      const requiredFlag =
        typeof required === "boolean" ? required : Boolean(required ?? true);

      const insertResult = await client.query(
        `INSERT INTO public.requirements
         (org_id, coverage_type, minimum_limit, required)
         VALUES ($1, $2, $3, $4)
         RETURNING id, org_id, coverage_type, minimum_limit, required, created_at`,
        [null, coverage_type.trim(), minLimitParsed, requiredFlag]
      );

      return res
        .status(201)
        .json({ ok: true, requirement: insertResult.rows[0] });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("requirements index error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Failed to load requirements" });
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}
