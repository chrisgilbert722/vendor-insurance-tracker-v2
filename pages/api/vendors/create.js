import { sql } from "../../../lib/db";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  const { name, email, orgId } = req.body || {};

  if (!name) {
    return res
      .status(400)
      .json({ ok: false, error: "Vendor name is required" });
  }

  if (!orgId) {
    return res
      .status(400)
      .json({ ok: false, error: "orgId is required" });
  }

  try {
    const uploadToken = crypto.randomBytes(24).toString("hex");
    const externalUuid = crypto.randomUUID();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const rows = await sql`
      INSERT INTO vendors (
        org_id,
        name,
        email,
        upload_token,
        upload_token_expires_at,
        external_uuid
      )
      VALUES (
        ${orgId},
        ${name},
        ${email || null},
        ${uploadToken},
        ${expiresAt},
        ${externalUuid}
      )
      RETURNING id, name, email, upload_token;
    `;

    const vendor = rows[0];

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `https://${req.headers.host || "vendor-insurance-tracker-v2.vercel.app"}`;

    const uploadUrl = `${baseUrl}/vendor-upload?token=${vendor.upload_token}`;

    return res.status(200).json({
      ok: true,
      vendor: {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        uploadUrl,
      },
    });
  } catch (err) {
    console.error("[api/vendors/create] ERROR:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message });
  }
}
