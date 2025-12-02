// pages/api/vendor/download-summary-pdf.js
import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";
import { pdf } from "@react-pdf/renderer";
import React from "react";

// PDF Components ----------------------------
function SectionTitle({ children }) {
  return (
    <div
      style={{
        fontSize: 14,
        fontWeight: 700,
        marginTop: 20,
        marginBottom: 6,
        color: "#222",
      }}
    >
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ marginBottom: 4, fontSize: 12 }}>
      <strong>{label}: </strong> {String(value)}
    </div>
  );
}

// MAIN PDF Document --------------------------
function SummaryPDF({ vendor, org, ai, alerts, status }) {
  return (
    <div
      style={{
        padding: 30,
        fontFamily: "Helvetica",
        fontSize: 12,
        color: "#222",
      }}
    >
      <h1
        style={{
          fontSize: 24,
          marginBottom: 4,
        }}
      >
        COI Summary Report
      </h1>
      <div
        style={{
          fontSize: 14,
          marginBottom: 20,
          color: "#555",
        }}
      >
        Generated for {org?.name}
      </div>

      {/* Vendor Block */}
      <SectionTitle>Vendor Information</SectionTitle>
      <Row label="Vendor" value={vendor?.name} />
      <Row label="Status" value={status?.label || "Pending"} />

      {/* Policies */}
      <SectionTitle>Detected Policies</SectionTitle>
      {ai.policyTypes?.map((p, i) => (
        <div key={i} style={{ marginLeft: 10 }}>
          • {p}
        </div>
      ))}

      {/* Limits */}
      <SectionTitle>Limits Extracted</SectionTitle>
      {Object.entries(ai.limits || {}).map(([name, vals], i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <strong>{name}</strong>
          <div style={{ marginLeft: 10 }}>
            {Object.entries(vals).map(([k, v]) => (
              <div key={k}>
                {k}: {v}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Endorsements */}
      <SectionTitle>Endorsements</SectionTitle>
      {ai.endorsements?.map((e, i) => (
        <div key={i} style={{ marginLeft: 10 }}>
          • {e}
        </div>
      ))}

      {/* Observations */}
      <SectionTitle>AI Observations</SectionTitle>
      <div style={{ whiteSpace: "pre-wrap" }}>{ai.observations}</div>

      {/* Rules */}
      <SectionTitle>AI Rule Suggestions</SectionTitle>
      <pre
        style={{
          background: "#f1f1f1",
          padding: 10,
          borderRadius: 6,
        }}
      >
        {JSON.stringify(ai.recommendedRules, null, 2)}
      </pre>

      {/* Alerts */}
      <SectionTitle>Alerts Detected</SectionTitle>
      {alerts?.length
        ? alerts.map((a, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <strong>{a.label || a.code}</strong>: {a.message}
            </div>
          ))
        : "No alerts detected."}
    </div>
  );
}

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ ok: false, error: "Missing token" });
    }

    // Lookup vendor
    const rows = await sql`
      SELECT id, org_id, name 
      FROM vendors 
      WHERE magic_link_token = ${token}
      LIMIT 1;
    `;
    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Invalid token" });
    }

    const vendor = rows[0];

    // Lookup org
    const orgRows = await sql`
      SELECT name FROM organizations WHERE id = ${vendor.org_id}
    `;
    const org = orgRows[0];

    // Load AI + requirements + alerts
    const portalDataRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/vendor/portal?token=${token}`
    );
    const portalData = await portalDataRes.json();

    // Build PDF
    const pdfDoc = (
      <SummaryPDF
        vendor={vendor}
        org={org}
        ai={portalData.ai}
        alerts={portalData.alerts}
        status={portalData.status}
      />
    );

    const file = await pdf(pdfDoc).toBuffer();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="COI-Summary-${vendor.id}.pdf"`
    );

    return res.send(file);
  } catch (err) {
    console.error("[download-summary-pdf ERROR]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
