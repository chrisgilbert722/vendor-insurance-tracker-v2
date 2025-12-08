// pages/admin/contracts/review.js
// ============================================================
// CONTRACT REVIEW COCKPIT V3 — Cinematic Contract Intelligence
//
// URL: /admin/contracts/review?vendorId=123
//
// Uses:
//  • /api/admin/vendor/overview?id=vendorId
// Shows:
//  • Vendor + Org info
//  • Contract risk score
//  • AI summary
//  • Required coverages & minimums
//  • Contract mismatches / issues
//  • Latest contract document link
// ============================================================

import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const GP = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.98)",
  border: "rgba(51,65,85,0.9)",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
  neonBlue: "#38bdf8",
  neonPurple: "#a855f7",
  neonGreen: "#22c55e",
  neonGold: "#facc15",
  neonRed: "#fb7185",
};

export default function ContractReviewPage() {
  const router = useRouter();
  const { vendorId } = router.query;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!vendorId) return;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `/api/admin/vendor/overview?id=${encodeURIComponent(vendorId)}`
        );
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Failed to load contract.");

        setData(json);
      } catch (err) {
        console.error("[ContractReview] load error:", err);
        setError(err.message || "Failed to load contract intelligence.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [vendorId]);

  // ==========================
  // LOADING / ERROR STATES
  // ==========================
  if (!vendorId) {
    return (
      <Shell>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Contract Review</h1>
        <p style={{ color: GP.textSoft, fontSize: 13 }}>
          Missing <code>vendorId</code> in query string.
        </p>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Contract Review</h1>
        <p style={{ color: GP.textSoft, fontSize: 13 }}>Loading…</p>
      </Shell>
    );
  }

  if (error || !data?.vendor) {
    return (
      <Shell>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Contract Review</h1>
        <p style={{ color: GP.neonRed, fontSize: 13 }}>
          {error || "Vendor not found."}
        </p>
      </Shell>
    );
  }

  // ==========================
  // EXTRACT DATA
  // ==========================
  const { vendor, org, documents } = data;

  // Contract intel (support multiple shapes just in case)
  const contractJson =
    vendor.contract_json ||
    null; // could also be data.contractIntel?.contract_json in other versions

  const contractScore =
    vendor.contract_score ??
    vendor.contract_risk_score ??
    null; // fallback if only risk_score exists

  const contractIssues =
    vendor.contract_mismatches ||
    vendor.contract_issues_json ||
    []; // fallback to issues_json if mismatches not mapped

  const latestContract =
    (documents || []).find((d) => d.document_type === "contract") || null;

  const riskColor =
    contractScore == null
      ? GP.textSoft
      : contractScore >= 80
      ? GP.neonGreen
      : contractScore >= 60
      ? GP.neonGold
      : GP.neonRed;

  return (
    <Shell>
      {/* HEADER */}
      <div style={headerRow}>
        <div>
          <div style={breadcrumb}>
            <a href="/vendors" style={{ color: GP.neonBlue }}>
              Vendors
            </a>
            <span>/</span>
            <a
              href={`/admin/vendor/${vendor.id}`}
              style={{ color: GP.neonBlue }}
            >
              {vendor.name}
            </a>
            <span>/</span>
            <span>Contract Review</span>
          </div>

          <h1 style={title}>
            Contract Review:{" "}
            <span style={titleGradient}>{vendor.name}</span>
          </h1>

          {org && (
            <p style={orgText}>
              Org: <span style={{ color: GP.text }}>{org.name}</span>
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => router.push(`/admin/vendor/${vendor.id}`)}
            style={pillButton(GP.neonBlue)}
          >
            ← Back to Vendor Overview
          </button>
          <button
            onClick={() => router.push(`/admin/vendor/${vendor.id}/profile`)}
            style={pillButton(GP.neonPurple)}
          >
            Open Vendor Profile
          </button>
        </div>
      </div>

      {/* TOP ROW: SCORE + META */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1.1fr)",
          gap: 18,
          marginBottom: 22,
        }}
      >
        {/* SCORE PANEL */}
        <div
          style={{
            borderRadius: 22,
            padding: 18,
            background: GP.panel,
            border: `1px solid ${GP.border}`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: GP.textSoft,
              marginBottom: 10,
            }}
          >
            Contract Risk Score (V3)
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  background:
                    contractScore == null
                      ? "linear-gradient(120deg,#9ca3af,#6b7280)"
                      : contractScore >= 80
                      ? "linear-gradient(120deg,#22c55e,#bef264)"
                      : contractScore >= 60
                      ? "linear-gradient(120deg,#facc15,#fde68a)"
                      : "linear-gradient(120deg,#fb7185,#fecaca)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                {contractScore ?? "—"}
              </div>
              <div style={{ fontSize: 12, color: GP.textSoft }}>
                Overall contract compliance
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: "rgba(15,23,42,1)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, contractScore ?? 0)
                    )}%`,
                    height: "100%",
                    background: riskColor,
                  }}
                />
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: GP.textSoft,
                  marginTop: 6,
                }}
              >
                Scores under <span style={{ color: GP.neonGold }}>70</span> may
                require review. Scores under{" "}
                <span style={{ color: GP.neonRed }}>55</span> indicate
                significant contract-to-coverage gaps.
              </div>
            </div>
          </div>
        </div>

        {/* META PANEL */}
        <div
          style={{
            borderRadius: 22,
            padding: 18,
            background: GP.panel,
            border: `1px solid ${GP.border}`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: GP.textSoft,
              marginBottom: 10,
            }}
          >
            Contract Document
          </div>

          {latestContract ? (
            <>
              <div
                style={{
                  fontSize: 13,
                  color: GP.text,
                  marginBottom: 6,
                }}
              >
                Latest contract on file:
              </div>
              <a
                href={latestContract.file_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 13,
                  color: GP.neonBlue,
                  textDecoration: "underline",
                  display: "inline-block",
                  marginBottom: 8,
                }}
              >
                📄 Open Contract PDF
              </a>

              <div
                style={{
                  fontSize: 11,
                  color: GP.textSoft,
                }}
              >
                Uploaded:{" "}
                {latestContract.uploaded_at
                  ? new Date(latestContract.uploaded_at).toLocaleString()
                  : "Unknown"}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: GP.textSoft }}>
              No contract document has been uploaded for this vendor yet.
            </div>
          )}
        </div>
      </div>

      {/* BODY GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1.3fr)",
          gap: 18,
        }}
      >
        {/* LEFT: SUMMARY + REQUIREMENTS */}
        <div
          style={{
            borderRadius: 22,
            padding: 18,
            background: GP.panel,
            border: `1px solid ${GP.border}`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: GP.textSoft,
              marginBottom: 10,
            }}
          >
            AI Contract Summary
          </div>

          {contractJson?.summary ? (
            <div
              style={{
                fontSize: 13,
                color: GP.textSoft,
                whiteSpace: "pre-wrap",
                lineHeight: 1.45,
                borderRadius: 14,
                border: "1px solid rgba(148,163,184,0.45)",
                background: "rgba(15,23,42,0.96)",
                padding: 12,
                marginBottom: 16,
              }}
            >
              {contractJson.summary}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: GP.textSoft, marginBottom: 12 }}>
              No AI contract summary is available yet. Ensure the contract has
              been parsed and matching has run.
            </div>
          )}

          {/* Required Coverages & Minimums */}
          {Array.isArray(contractJson?.requirements) &&
          contractJson.requirements.length > 0 ? (
            <>
              <h3
                style={{
                  fontSize: 14,
                  margin: 0,
                  marginBottom: 8,
                  color: GP.neonBlue,
                }}
              >
                Required Coverages & Minimums
              </h3>
              <div style={{ fontSize: 12 }}>
                {contractJson.requirements.map((r, idx) => (
                  <div
                    key={idx}
                    style={{
                      marginBottom: 6,
                      padding: 8,
                      borderRadius: 10,
                      border: "1px solid rgba(51,65,85,0.8)",
                      background: "rgba(15,23,42,0.92)",
                    }}
                  >
                    <strong style={{ color: GP.text }}>{r.label}:</strong>{" "}
                    <span style={{ color: GP.neonGold }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div
              style={{
                fontSize: 12,
                color: GP.textSoft,
                marginTop: 4,
              }}
            >
              No normalized requirements are attached to this contract yet. You
              can still rely on the issues list to see gaps.
            </div>
          )}
        </div>

        {/* RIGHT: ISSUES / MISMATCHES */}
        <div
          style={{
            borderRadius: 22,
            padding: 18,
            background: GP.panel,
            border: `1px solid ${GP.border}`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: GP.textSoft,
              marginBottom: 10,
            }}
          >
            Contract Issues & Mismatches
          </div>

          {!contractIssues || contractIssues.length === 0 ? (
            <div style={{ fontSize: 13, color: GP.textSoft }}>
              No contract issues recorded.
            </div>
          ) : (
            <div
              style={{
                maxHeight: 260,
                overflowY: "auto",
                paddingRight: 2,
              }}
            >
              {contractIssues.map((issue, idx) => {
                const sev = (issue.severity || "high").toLowerCase();
                const sevColor =
                  sev === "critical"
                    ? GP.neonRed
                    : sev === "high"
                    ? GP.neonGold
                    : sev === "medium"
                    ? GP.neonBlue
                    : GP.textSoft;

                return (
                  <div
                    key={idx}
                    style={{
                      marginBottom: 10,
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid rgba(248,113,113,0.5)",
                      background: "rgba(127,29,29,0.35)",
                      fontSize: 12,
                      color: GP.textSoft,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        marginBottom: 4,
                        color: sevColor,
                      }}
                    >
                      {issue.code || "CONTRACT_ISSUE"} ·{" "}
                      {String(sev).toUpperCase()}
                    </div>
                    <div>{issue.message || "Contract requirement not met."}</div>

                    {issue.requirement && (
                      <div
                        style={{
                          fontSize: 11,
                          marginTop: 4,
                          color: GP.neonGold,
                        }}
                      >
                        Required:{" "}
                        {typeof issue.requirement === "object"
                          ? JSON.stringify(issue.requirement)
                          : String(issue.requirement)}
                      </div>
                    )}

                    {issue.actual && (
                      <div
                        style={{
                          fontSize: 11,
                          marginTop: 2,
                          color: GP.neonBlue,
                        }}
                      >
                        Actual:{" "}
                        {typeof issue.actual === "object"
                          ? JSON.stringify(issue.actual)
                          : String(issue.actual)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ACTIONS */}
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => router.push(`/admin/vendor/${vendor.id}`)}
              style={pillButton(GP.neonBlue)}
            >
              View Vendor Coverage & Alerts
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ============================================================
   SHELL + STYLES
============================================================ */

function Shell({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000 100%)",
        padding: "32px 40px 40px",
        color: GP.text,
        position: "relative",
      }}
    >
      {/* AURA */}
      <div
        style={{
          position: "absolute",
          top: -260,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1100,
          height: 1100,
          background:
            "radial-gradient(circle, rgba(56,189,248,0.35), transparent 60%)",
          filter: "blur(120px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

const headerRow = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 18,
};

const breadcrumb = {
  fontSize: 12,
  color: GP.textSoft,
  marginBottom: 6,
  display: "flex",
  gap: 8,
  alignItems: "center",
};

const title = {
  margin: 0,
  fontSize: 24,
  fontWeight: 600,
  color: GP.text,
};

const titleGradient = {
  background: "linear-gradient(90deg,#38bdf8,#a855f7,#f97316)",
  WebkitBackgroundClip: "text",
  color: "transparent",
};

const orgText = {
  marginTop: 4,
  fontSize: 13,
  color: GP.textSoft,
};

function pillButton(color) {
  return {
    padding: "8px 14px",
    borderRadius: 999,
    border: `1px solid ${color}`,
    background: "rgba(15,23,42,0.9)",
    color,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}
