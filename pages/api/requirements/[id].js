// pages/api/requirements/[id].js
import { Client } from "pg";

export default async function handler(req, res) {
  const { id } = req.query;
  const reqId = parseInt(id, 10);

  if (Number.isNaN(reqId)) {
    return res.status(400).json({ ok: false, error: "Invalid requirement id." });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    if (req.method === "PUT") {
      const { coverage_type, minimum_limit, required } = req.body;

      const fields = [];
      const values = [];
      let idx = 1;

      if (coverage_type) {
        fields.push(`coverage_type = $${idx++}`);
        values.push(coverage_type.trim());
      }

      if (minimum_limit !== undefined) {
        const minLimitParsed =
          typeof minimum_limit === "number"
            ? minimum_limit
            : minimum_limit
            ? parseInt(minimum_limit, 10)
            : null;
        fields.push(`minimum_limit = $${idx++}`);
        values.push(minLimitParsed);
      }

      if (required !== undefined) {
        fields.push(`required = $${idx++}`);
        values.push(Boolean(required));
      }

      if (fields.length === 0) {
        return res
          .status(400)
          .json({ ok: false, error: "No fields to update." });
      }

      values.push(reqId);

      const updateResult = await client.query(
        `UPDATE public.requirements
         SET ${fields.join(", ")}
         WHERE id = $${idx}
         RETURNING id, org_id, coverage_type, minimum_limit, required, created_at`,
        values
      );

      if (updateResult.rows.length === 0) {
        return res
          .status(404)
          .json({ ok: false, error: "Requirement not found." });
      }

      return res
        .status(200)
        .json({ ok: true, requirement: updateResult.rows[0] });
    }

    if (req.method === "DELETE") {
      const delResult = await client.query(
        `DELETE FROM public.requirements
         WHERE id = $1
         RETURNING id`,
        [reqId]
      );

      if (delResult.rows.length === 0) {
        return res
          .status(404)
          .json({ ok: false, error: "Requirement not found." });
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("requirements [id] error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Requirement update failed" });
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}
