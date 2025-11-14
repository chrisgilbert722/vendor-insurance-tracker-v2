// pages/api/get-policies.js

import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();

    const result = await client.query(
      `SELECT id, policy_number, carrier, effective_date, expiration_date, coverage_type, status, created_at
       FROM policies
       ORDER BY created_at DESC`
    );

    await client.end();

    return res.status(200).json({
      ok: true,
      policies: result.rows
    });

  } catch (err) {
    console.error("GET POLICIES ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
