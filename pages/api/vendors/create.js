import { Client } from "pg";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { name, email } = req.body || {};

  if (!name) {
    return res.status(400).json({ ok: false, error: "Vendor name is required" });
  }

  let client;

  try {
    const uploadToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day link

    client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    // For now, hardcode org_id = 1 (we’ll wire real orgs later)
    const orgId = 1;

    const result = await client.query(
      `INSERT INTO vendors
        (org_id, name, email, upload_token, upload_token_expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, upload_token`,
      [orgId, name, email || null, uploadToken, expiresAt]
    );

    const vendor = result.rows[0];

    await client.end();

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
    console.error("create vendor ERROR:", err);
    if (client) {
      try {
        await client.end();
      } catch (_) {}
    }
    return res.status(500).json({ ok: false, error: err.message });
  }
}
