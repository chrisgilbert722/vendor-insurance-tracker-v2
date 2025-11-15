import { Client } from "pg";

export default async function handler(req, res) {
  const { id } = req.query;

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    const vendorRes = await client.query(
      `SELECT * FROM public.vendors WHERE id = $1`,
      [id]
    );

    if (vendorRes.rows.length === 0) {
      await client.end();
      return res.status(404).json({ error: "Vendor not found" });
    }

    const policiesRes = await client.query(
      `SELECT *
       FROM public.policies
       WHERE vendor_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    await client.end();

    return res.status(200).json({
      vendor: vendorRes.rows[0],
      policies: policiesRes.rows,
    });
  } catch (err) {
    console.error("Vendor drawer API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
