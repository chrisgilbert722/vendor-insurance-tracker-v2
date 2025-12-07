// pages/admin/renewals/queue.js
// ==========================================================
// RENEWAL INTELLIGENCE V3 — STEP 3
// Renewal Queue UI (Operational Cockpit)
// Actionable list sorted by urgency, risk, SLA stage.
// ==========================================================

import { useEffect, useState, useMemo } from "react";
import { useOrg } from "../../../context/OrgContext";
import ToastV2 from "../../../components/ToastV2";
import CockpitWizardLayout from "../../../components/CockpitWizardLayout";
import { useRouter } from "next/router";

export default function RenewalQueuePage() {
  const { activeOrgId: orgId } = useOrg();
  const router = useRouter();

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({
    open: false,
    type: "success",
    message: "",
  });

  // -----------------------------------------------------------
  // LOAD RENEWAL STATUS
  // -----------------------------------------------------------
  async function load() {
    if (!orgId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/renewals/status?orgId=${orgId}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to load renewal status");
      setVendors(json.vendors || []);
    } catch (err) {
      console.error(err);
      setToast({
        open: true,
        type: "error",
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [orgId]);

  // -----------------------------------------------------------
  // SORTING LOGIC (by SLA + risk)
  // -----------------------------------------------------------
  const sorted = useMemo(() => {
    return [...vendors].sort((a, b) => {
      // 1. Expired → Critical first
      const order = (v) =>
        v.daysToExpire === null
          ? 9999
          : v.daysToExpire < 0
          ? -1000
          : v.daysToExpire;

      // Compare based on days to expire first
      const da = order(a);
      const db = order(b);

      if (da !== db) return da - db;

      // Then by risk score
      return (b.riskScore || 0) - (a.riskScore || 0);
    });
  }, [vendors]);

  // -----------------------------------------------------------
  // COLOR LOGIC
  // -----------------------------------------------------------
  function stageColor(stage) {
    switch (stage) {
      case "expired":
        return "#ef4444";
      case "3_day":
        return "#f97316";
      case "7_day":
        return "#fb923c";
      case "30_day":
        return "#facc15";
      case "90_day":
        return "#38bdf8";
      default:
        return "#9ca3af";
    }
  }

  // -----------------------------------------------------------
  // ACTION HANDLERS
  // -----------------------------------------------------------
  function openVendor(vendorId) {
    router.push(`/admin/vendor/${vendorId}`);
  }

  function openTimeline(vendorId) {
    router.push(`/admin/vendor/${vendorId}?view=timeline`);
  }

  async function sendRenewalEmail(vendor) {
    try {
      const res = await fetch("/api/renewals/send-email-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: vendor.vendorId, orgId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setToast({
        open: true,
        type: "success",
        message: `Sent renewal email to ${vendor.vendorName}`,
      });
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        message: "Email failed: " + err.message,
      });
    }
  }

  // -----------------------------------------------------------
  // MAIN RENDER
  // -----------------------------------------------------------
  return (
    <CockpitWizardLayout>
      <div style={{ position: "relative", zIndex: 3 }}>
        {/* HEADER */}
        <h1
          style={{
            fontSize: 30,
            marginBottom: 10,
            background: "linear-gradient(90deg,#38bdf8,#facc15,#ef4444)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Renewal Queue
        </h1>

        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>
          Prioritized list of vendors requiring renewal action.
        </p>

        {/* REFRESH BUTTON */}
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            marginBottom: 16,
            background: loading
              ? "rgba(56,189,248,0.4)"
              : "linear-gradient(90deg,#38bdf8,#0ea5e9)",
            border: "1px solid rgba(56,189,248,0.8)",
            color: "white",
            fontSize: 12,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>

        {/* TABLE */}
        <div
          style={{
            borderRadius: 18,
            padding: 18,
            background: "rgba(15,23,42,0.9)",
            border: "1px solid rgba(80,120,255,0.45)",
            boxShadow:
              "0 0 28px rgba(64,106,255,0.28), inset 0 0 18px rgba(15,23,42,0.9)",
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              fontSize: 13,
            }}
          >
            <thead>
              <tr>
                <th style={th}>Vendor</th>
                <th style={th}>Days Left</th>
                <th style={th}>SLA</th>
                <th style={th}>Risk</th>
                <th style={th}>Reliability</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {sorted.map((v) => {
                const color = stageColor(v.slaStage);

                return (
                  <tr key={v.vendorId} style={row}>
                    {/* VENDOR NAME */}
                    <td style={td}>{v.vendorName}</td>

                    {/* DAYS LEFT */}
                    <td style={td}>
                      {v.daysToExpire === null
                        ? "—"
                        : v.daysToExpire < 0
                        ? `${Math.abs(v.daysToExpire)}d overdue`
                        : `${v.daysToExpire}d`}
                    </td>

                    {/* SLA STAGE COLOR BADGE */}
                    <td style={td}>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 11,
                          background: color + "30",
                          color,
                          border: `1px solid ${color}`,
                        }}
                      >
                        {v.slaStage.replace("_", " ").toUpperCase()}
                      </span>
                    </td>

                    {/* RISK SCORE */}
                    <td style={td}>{v.riskScore}</td>

                    {/* RELIABILITY */}
                    <td style={td}>{v.reliability}%</td>

                    {/* ACTIONS */}
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => openVendor(v.vendorId)}
                          style={actionBtn("#38bdf8")}
                        >
                          Open
                        </button>

                        <button
                          onClick={() => openTimeline(v.vendorId)}
                          style={actionBtn("#a855f7")}
                        >
                          Timeline
                        </button>

                        <button
                          onClick={() => sendRenewalEmail(v)}
                          style={actionBtn("#22c55e")}
                        >
                          Email
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* EMPTY STATE */}
          {sorted.length === 0 && !loading && (
            <div
              style={{
                marginTop: 20,
                fontSize: 13,
                color: "#9ca3af",
                textAlign: "center",
              }}
            >
              No vendors found.
            </div>
          )}
        </div>

        {/* TOAST */}
        <ToastV2
          open={toast.open}
          type={toast.type}
          message={toast.message}
          onClose={() =>
            setToast((p) => ({
              ...p,
              open: false,
            }))
          }
        />
      </div>
    </CockpitWizardLayout>
  );
}

/* =======================
   STYLING
======================= */

const th = {
  padding: "8px 10px",
  color: "#9ca3af",
  fontWeight: 600,
  fontSize: 11,
  textAlign: "left",
  borderBottom: "1px solid rgba(148,163,184,0.4)",
};

const td = {
  padding: "8px 10px",
  color: "#e5e7eb",
  fontSize: 13,
  borderBottom: "1px solid rgba(148,163,184,0.2)",
};

const row = {
  background:
    "linear-gradient(90deg,rgba(15,23,42,0.96),rgba(15,23,42,0.92))",
};

function actionBtn(color) {
  return {
    padding: "4px 10px",
    borderRadius: 8,
    fontSize: 11,
    border: `1px solid ${color}`,
    background: "rgba(15,23,42,0.9)",
    color,
    cursor: "pointer",
  };
}
