// pages/api/broker/portal-init.js
// Validates broker token and returns org compliance overview (read-only)

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ ok: false, error: "Missing token" });
    }

    // Validate token
    const [tokenRecord] = await sql`
      SELECT org_id, expires_at, metadata
      FROM vendor_portal_tokens
      WHERE token = ${token}
        AND (portal_type = 'broker' OR vendor_id IS NULL)
      LIMIT 1;
    `;

    if (!tokenRecord) {
      return res.status(404).json({ ok: false, error: "Invalid or unknown link" });
    }

    if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < new Date()) {
      return res.status(410).json({ ok: false, error: "This link has expired" });
    }

    const orgId = tokenRecord.org_id;
    const metadata = tokenRecord.metadata || {};

    // Get organization details
    const [org] = await sql`
      SELECT id, name FROM organizations WHERE id = ${orgId} LIMIT 1;
    `;

    if (!org) {
      return res.status(404).json({ ok: false, error: "Organization not found" });
    }

    // Get vendor compliance summary
    const vendors = await sql`
      SELECT
        v.id,
        v.name,
        v.email,
        v.status,
        v.compliance_score
      FROM vendors v
      WHERE v.org_id = ${orgId}
      ORDER BY v.name ASC;
    `;

    // Get policy summary for each vendor
    const policies = await sql`
      SELECT
        p.vendor_id,
        p.coverage_type,
        p.carrier_name,
        p.expiration_date,
        p.status
      FROM policies p
      JOIN vendors v ON v.id = p.vendor_id
      WHERE v.org_id = ${orgId}
      ORDER BY p.expiration_date ASC;
    `;

    // Get alert counts
    const alertCounts = await sql`
      SELECT
        vendor_id,
        severity,
        COUNT(*)::int AS count
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND resolved_at IS NULL
      GROUP BY vendor_id, severity;
    `;

    // Build vendor map with policies and alerts
    const policyMap = {};
    for (const p of policies) {
      if (!policyMap[p.vendor_id]) policyMap[p.vendor_id] = [];
      policyMap[p.vendor_id].push(p);
    }

    const alertMap = {};
    for (const a of alertCounts) {
      if (!alertMap[a.vendor_id]) alertMap[a.vendor_id] = { total: 0, critical: 0, high: 0 };
      alertMap[a.vendor_id].total += a.count;
      if (a.severity === "critical") alertMap[a.vendor_id].critical = a.count;
      if (a.severity === "high") alertMap[a.vendor_id].high = a.count;
    }

    const vendorList = vendors.map((v) => ({
      id: v.id,
      name: v.name,
      email: v.email,
      status: v.status || "unknown",
      complianceScore: v.compliance_score || null,
      policies: policyMap[v.id] || [],
      alerts: alertMap[v.id] || { total: 0, critical: 0, high: 0 },
    }));

    // Calculate summary stats
    const now = Date.now();
    const summary = {
      totalVendors: vendors.length,
      compliant: vendors.filter((v) => (v.compliance_score || 0) >= 80).length,
      atRisk: vendors.filter((v) => (v.compliance_score || 0) < 60).length,
      expiringIn30Days: policies.filter((p) => {
        if (!p.expiration_date) return false;
        const daysLeft = Math.floor((new Date(p.expiration_date).getTime() - now) / 86400000);
        return daysLeft >= 0 && daysLeft <= 30;
      }).length,
      totalAlerts: alertCounts.reduce((sum, a) => sum + a.count, 0),
    };

    return res.status(200).json({
      ok: true,
      org: {
        id: org.id,
        name: org.name,
      },
      brokerInfo: {
        name: metadata.brokerName || null,
        email: metadata.brokerEmail || null,
      },
      vendors: vendorList,
      summary,
      accessType: "read-only",
    });
  } catch (err) {
    console.error("[broker/portal-init] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to load portal data",
    });
  }
}
