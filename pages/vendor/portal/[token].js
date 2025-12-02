// pages/vendor/portal/[token].js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const GP = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.98)",
  border: "rgba(51,65,85,0.9)",
  neonBlue: "#38bdf8",
  neonGreen: "#22c55e",
  neonGold: "#facc15",
  neonRed: "#fb7185",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
};

export default function VendorPortal() {
  const router = useRouter();
  const { token } = router.query;

  const [loading, setLoading] = useState(true);
  const [vendorData, setVendorData] = useState(null);
  const [error, setError] = useState("");

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  // Fix Mode
  const [resolvedCodes, setResolvedCodes] = useState([]);

  // ⭐⭐⭐ SECTION 1 — TIMELINE STATE ⭐⭐⭐
  const [timeline, setTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  /* ============================================================
     LOAD PORTAL DATA
  ============================================================ */
  useEffect(() => {
    if (!token) return;

    async function load() {
      try {
        setLoading(true);

        const res = await fetch(`/api/vendor/portal?token=${token}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Invalid link");

        setVendorData(json);

        // Fix Mode restore
        const saved = localStorage.getItem(`vendor_fix_${token}`);
        if (saved) setResolvedCodes(JSON.parse(saved));
      } catch (err) {
        setError(err.message || "Could not load vendor portal.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  /* ============================================================
     ⭐⭐⭐ SECTION 2 — LOAD ACTIVITY TIMELINE (D3) ⭐⭐⭐
  ============================================================ */
  useEffect(() => {
    if (!token) return;

    async function loadTimeline() {
      try {
        setLoadingTimeline(true);
        const res = await fetch(`/api/vendor/timeline?token=${token}`);
        const json = await res.json();
        if (json.ok) setTimeline(json.timeline);
      } catch (err) {
        console.error("[timeline] failed:", err);
      } finally {
        setLoadingTimeline(false);
      }
    }

    loadTimeline();
  }, [token]);
  /* ============================================================
     UI START
  ============================================================ */
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "radial-gradient(circle at top,#020617,#000)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: GP.textSoft,
        }}
      >
        Loading vendor portal...
      </div>
    );
  }

  if (error || !vendorData) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "radial-gradient(circle at top,#020617,#000)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: GP.text,
          textAlign: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 50 }}>⚠️</div>
          <div style={{ fontSize: 18 }}>Invalid or expired vendor link.</div>
        </div>
      </div>
    );
  }

  const { vendor, org, requirements, alerts, status, ai } = vendorData;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: GP.bg,
        padding: "32px 24px",
        color: GP.text,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          maxWidth: 1150,
          margin: "0 auto 24px auto",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: 12, textTransform: "uppercase", color: GP.textSoft }}>
            Vendor Compliance Portal
          </div>

          <h1
            style={{
              margin: "4px 0",
              fontSize: 28,
              background: "linear-gradient(90deg,#38bdf8,#a855f7,#22c55e)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            {vendor?.name}
          </h1>

          <div style={{ fontSize: 13, color: GP.textSoft }}>
            For {org?.name}
          </div>
        </div>

        {/* STATUS PILL */}
        <div
          style={{
            padding: "6px 14px",
            borderRadius: 999,
            border: `1px solid ${GP.border}`,
            background: "rgba(15,23,42,0.9)",
          }}
        >
          <div style={{ fontSize: 11, color: GP.textSoft }}>Status</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color:
                status?.state === "compliant"
                  ? GP.neonGreen
                  : status?.state === "pending"
                  ? GP.neonGold
                  : GP.neonRed,
            }}
          >
            {status?.label}
          </div>
        </div>
      </div>
        {/* RIGHT SIDE — Fix Issues + Requirements + Timeline */}
        <div>
          {/* FIX MODE BLOCK */}
          <div
            style={{
              borderRadius: 20,
              padding: 18,
              border: `1px solid ${GP.border}`,
              background: "rgba(15,23,42,0.92)",
              marginBottom: 24,
            }}
          >
            <h3 style={{ marginTop: 0 }}>Fix Issues</h3>
            {alerts?.length ? (
              alerts.map((item, i) => {
                const resolved = resolvedCodes.includes(item.code);

                return (
                  <div
                    key={i}
                    style={{
                      marginBottom: 14,
                      padding: 12,
                      borderRadius: 14,
                      background: "rgba(2,6,23,0.6)",
                      border: "1px solid rgba(148,163,184,0.3)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color:
                          item.severity === "critical"
                            ? GP.neonRed
                            : item.severity === "high"
                            ? GP.neonGold
                            : GP.neonBlue,
                      }}
                    >
                      {item.label || item.code}
                    </div>

                    <div style={{ fontSize: 12, color: GP.textSoft, marginTop: 4 }}>
                      {item.message}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleResolved(item.code)}
                      style={{
                        marginTop: 10,
                        padding: "6px 14px",
                        borderRadius: 999,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        color: resolved ? GP.neonGreen : GP.text,
                        border: resolved
                          ? "1px solid rgba(34,197,94,0.8)"
                          : "1px solid rgba(148,163,184,0.4)",
                        background: resolved
                          ? "rgba(34,197,94,0.15)"
                          : "rgba(15,23,42,0.85)",
                      }}
                    >
                      {resolved ? "✓ Marked Fixed" : "Resolve Issue"}
                    </button>
                  </div>
                );
              })
            ) : (
              <div style={{ color: GP.textSoft }}>No issues detected.</div>
            )}
          </div>

          {/* REQUIREMENTS BLOCK */}
          <div
            style={{
              borderRadius: 20,
              padding: 18,
              border: `1px solid ${GP.border}`,
              background: "rgba(15,23,42,0.92)",
              marginBottom: 24,
            }}
          >
            <h3 style={{ marginTop: 0 }}>Coverage Requirements</h3>
            <ul style={{ paddingLeft: 18 }}>
              {(requirements?.coverages || []).map((c, i) => (
                <li key={i}>
                  <strong>{c.name}</strong>{" "}
                  {c.limit && `— ${c.limit}`}
                </li>
              ))}
            </ul>
          </div>

          {/* ⭐⭐⭐ SECTION 3 — ACTIVITY TIMELINE PANEL ⭐⭐⭐ */}
          <div
            style={{
              borderRadius: 20,
              padding: 18,
              border: `1px solid ${GP.border}`,
              background: "rgba(15,23,42,0.92)",
              marginTop: 24,
            }}
          >
            <h3 style={{ marginTop: 0 }}>Recent Activity</h3>

            {loadingTimeline ? (
              <div style={{ color: GP.textSoft, fontSize: 13 }}>Loading activity…</div>
            ) : timeline?.length === 0 ? (
              <div style={{ color: GP.textSoft, fontSize: 13 }}>
                No recent activity logged.
              </div>
            ) : (
              <ul style={{ paddingLeft: 0, listStyle: "none", margin: 0 }}>
                {timeline.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      marginBottom: 14,
                      padding: 12,
                      borderRadius: 14,
                      background: "rgba(2,6,23,0.6)",
                      border: "1px solid rgba(148,163,184,0.28)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        textTransform: "uppercase",
                        color:
                          item.severity === "critical"
                            ? GP.neonRed
                            : item.severity === "warn"
                            ? GP.neonGold
                            : GP.neonBlue,
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      {item.action.replace(/_/g, " ")}
                    </div>

                    <div style={{ fontSize: 13, color: GP.textSoft }}>
                      {item.message}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        color: GP.textSoft,
                        opacity: 0.6,
                      }}
                    >
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
