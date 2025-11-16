// pages/api/org/ensure.js

import { Client } from "pg";

/**
 * Body: { userId: string, email: string, orgName?: string }
 *
 * If the user already belongs to an organization, returns that org + membership.
 * If not, creates a new organization and membership, and returns them.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed. Use POST." });
  }

  const { userId, email, orgName } = req.body || {};

  if (!userId || typeof userId !== "string") {
    return res
      .status(400)
      .json({ ok: false, error: "userId is required (Supabase user.id)." });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // 1) See if user is already in an org
    const memberRes = await client.query(
      `SELECT m.id, m.org_id, m.role, o.name, o.created_at
       FROM public.organization_members m
       JOIN public.organizations o ON o.id = m.org_id
       WHERE m.user_id = $1
       ORDER BY m.created_at ASC
       LIMIT 1`,
      [userId]
    );

    if (memberRes.rows.length > 0) {
      const m = memberRes.rows[0];
      return res.status(200).json({
        ok: true,
        organization: {
          id: m.org_id,
          name: m.name,
          created_at: m.created_at,
        },
        membership: {
          role: m.role,
        },
        created: false,
      });
    }

    // 2) No membership yet → create new org
    const defaultName =
      orgName ||
      (email && email.includes("@")
        ? `${email.split("@")[0]}'s Organization`
        : "New Organization");

    const orgInsert = await client.query(
      `INSERT INTO public.organizations (name)
       VALUES ($1)
       RETURNING id, name, created_at`,
      [defaultName]
    );

    const org = orgInsert.rows[0];

    // 3) Create membership as admin
    await client.query(
      `INSERT INTO public.organization_members (org_id, user_id, role)
       VALUES ($1, $2, 'admin')`,
      [org.id, userId]
    );

    return res.status(200).json({
      ok: true,
      organization: org,
      membership: {
        role: "admin",
      },
      created: true,
    });
  } catch (err) {
    console.error("org/ensure error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Failed to ensure org." });
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}
