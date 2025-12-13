import { sql } from "../../../lib/db";
import { requireApiKey } from "../../../lib/apiAuth";

export default async function handler(req, res) {
  try {
    const orgId = await requireApiKey(req);

    const docs = await sql`
      SELECT
        d.id,
        d.vendor_id,
        d.document_type,
        d.status,
        d.expires_on,
        d.uploaded_at
      FROM vendor_documents d
      JOIN vendors v ON v.id = d.vendor_id
      WHERE v.org_id = ${orgId}
      ORDER BY d.uploaded_at DESC
    `;

    res.json({ ok: true, documents: docs });
  } catch (err) {
    res.status(401).json({ ok: false, error: err.message });
  }
}
