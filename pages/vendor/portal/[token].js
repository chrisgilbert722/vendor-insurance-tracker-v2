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

  // Timeline state
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

        const saved = localStorage.getItem(`vendor_fix_${token}`);
        if (saved) {
          setResolvedCodes(JSON.parse(saved));
        }
      } catch (err) {
        setError(err.message || "Could not load vendor portal.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  /* ============================================================
     LOAD ACTIVITY TIMELINE
  ============================================================ */
  useEffect(() => {
    if (!token) return;

    async function loadTimeline() {
      try {
        setLoadingTimeline(true);
        const res = await fetch(`/api/vendor/timeline?token=${token}`);
        const json = await res.json();
        if (json.ok) setTimeline(json.timeline || []);
      } catch (err) {
        console.error("[timeline] failed:", err);
      } finally {
        setLoadingTimeline(false);
      }
    }

    loadTimeline();
  }, [token]);

  /* ============================================================
     FIX MODE — PERSIST RESOLUTION
  ============================================================ */
  async function toggleResolved(code) {
    const updated = resolvedCodes.includes(code)
      ? resolvedCodes.filter((c) => c !== code)
      : [...resolvedCodes, code];

    setResolvedCodes(updated);
    localStorage.setItem(`vendor_fix_${token}`, JSON.stringify(updated));

    try {
      await fetch("/api/vendor/fix-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: vendorData.vendor.id,
          orgId: vendorData.org.id,
          code,
        }),
      });

      const res = await fetch(`/api/vendor/portal?token=${token}`);
      const json = await res.json();
      if (json.ok) setVendorData(json);
    } catch (err) {
      console.error("Fix-issue failed:", err);
    }
  }

  /* ============================================================
     FILE HANDLING
  ============================================================ */
  function handleFileInput(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF files allowed.");
      return;
    }
    setSelectedFile(f);
    setUploadError("");
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF files allowed.");
      return;
    }
    setSelectedFile(f);
    setUploadError("");
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  /* ============================================================
     UPLOAD + AI PARSE FLOW
  ============================================================ */
  async function handleUpload() {
    if (!selectedFile) {
      setUploadError("Please choose a COI PDF first.");
      return;
    }

    try {
      setUploading(true);
      setUploadError("");
      setUploadSuccess("");

      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("token", token);

      const res = await fetch("/api/vendor/upload-coi", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Upload failed");

      setUploadSuccess("Uploaded! Parsing your COI…");

      setVendorData((prev) => ({
        ...prev,
        ai: json.ai || prev?.ai,
        alerts: json.alerts || prev?.alerts,
        status: {
          state: json.status || prev?.status?.state,
          label: (json.status || prev?.status?.state || "pending").toUpperCase(),
        },
      }));

      setTimeout(() => setUploadSuccess("COI analyzed successfully!"), 700);
    } catch (err) {
      setUploadError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  /* ============================================================
     LOADING + ERROR UI
  ============================================================ */
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: GP.bg,
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
          background: GP.bg,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: GP.text,
          textAlign: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 50 }}>⚠️</div>
          <div style={{ fontSize: 18 }}>{error || "Invalid vendor link."}</div>
        </div>
      </div>
    );
  }

  const { vendor, org, requirements, alerts, status, ai } = vendorData;

  /* ============================================================
     MAIN UI
  ============================================================ */
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

      {/* MAIN GRID */}
      <div
        style={{
          maxWidth: 1150,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0,1.7fr) minmax(0,1.1fr)",
          gap: 24,
        }}
      >
        {/* LEFT SIDE — Upload + AI Summary */}
        <div>
          {/* UPLOAD PANEL */}
          <div
            style={{
              borderRadius: 20,
              padding: 20,
              border: `1px dashed ${GP.border}`,
              background: "rgba(15,23,42,0.92)",
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <h3 style={{ marginTop: 0 }}>Upload COI PDF</h3>

            <input
              id="coiUpload"
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={handleFileInput}
            />
            <label htmlFor="coiUpload">
              <div
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: "linear-gradient(90deg,#38bdf8,#0ea5e9)",
                  cursor: "pointer",
                  display: "inline-block",
                }}
              >
                Choose File
              </div>
            </label>

            {selectedFile && (
              <div style={{ marginTop: 10, fontSize: 12, color: GP.neonBlue }}>
                Selected: {selectedFile.name}
              </div>
            )}

            {uploadError && (
              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 8,
                  background: "rgba(127,29,29,0.8)",
                  border: "1px solid #f87171",
                  color: "#fecaca",
                }}
              >
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 8,
                  background: "rgba(16,185,129,0.2)",
                  border: "1px solid #4ade80",
                  color: "#bbf7d0",
                }}
              >
                {uploadSuccess}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={uploading}
              style={{
                marginTop: 18,
                padding: "10px 20px",
                borderRadius: 999,
                border: `1px solid ${GP.neonBlue}`,
                background: "linear-gradient(90deg,#38bdf8,#0ea5e9)",
                color: "#e5f2ff",
                cursor: uploading ? "not-allowed" : "pointer",
              }}
            >
              {uploading ? "Uploading & Analyzing…" : "Upload & Analyze COI →"}
            </button>
          </div>

          {/* AI SUMMARY PANEL */}
          {ai && (
            <div
              style={{
                marginTop: 24,
                borderRadius: 20,
                padding: 20,
                border: `1px solid ${GP.border}`,
                background: "rgba(15,23,42,0.92)",
                boxShadow: "0 0 35px rgba(56,189,248,0.15)",
              }}
            >
              <h3 style={{ marginTop: 0 }}>AI COI Summary</h3>

              {ai.brokerStyle && (
                <div style={{ marginBottom: 14 }}>
                  <strong style={{ color: GP.neonBlue }}>Broker Style:</strong>
                  <div style={{ fontSize: 13, color: GP.textSoft }}>
                    {ai.brokerStyle}
                  </div>
                </div>
              )}

              {ai.policyTypes && (
                <div style={{ marginBottom: 14 }}>
                  <strong style={{ color: GP.neonBlue }}>Detected Policies:</strong>
                  <div
                    style={{
                      marginTop: 6,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    {ai.policyTypes.map((p, i) => (
                      <span
                        key={i}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 11,
                          color: GP.neonBlue,
                          border: `1px solid ${GP.neonBlue}80`,
                          background: "rgba(15,23,42,0.85)",
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {ai.limits && (
                <div style={{ marginBottom: 14 }}>
                  <strong style={{ color: GP.neonBlue }}>Extracted Limits:</strong>
                  {Object.entries(ai.limits).map(([policy, vals], i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#e5e7eb",
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        {policy}
                      </div>
                      <div
                        style={{
                          background: "rgba(2,6,23,0.6)",
                          padding: 10,
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      >
                        {Object.entries(vals).map(([k, v]) => (
                          <div key={k} style={{ color: GP.textSoft }}>
                            {k}: <span style={{ color: GP.neonGold }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {ai.endorsements?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <strong style={{ color: GP.neonBlue }}>Endorsements:</strong>
                  <div
                    style={{
                      marginTop: 6,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    {ai.endorsements.map((e, i) => (
                      <span
                        key={i}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 11,
                          color: "#a855f7",
                          border: "1px solid rgba(168,85,247,0.5)",
                          background: "rgba(15,23,42,0.85)",
                        }}
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {ai.observations && (
                <div style={{ marginBottom: 14 }}>
                  <strong style={{ color: GP.neonBlue }}>AI Notes:</strong>
                  <p style={{ fontSize: 13, color: GP.textSoft }}>
                    {ai.observations}
                  </p>
                </div>
              )}
            </div>
          )}
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
                  <strong>{c.name}</strong> {c.limit && `— ${c.limit}`}
                </li>
              ))}
            </ul>
          </div>

          {/* ACTIVITY TIMELINE PANEL */}
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
              <div style={{ color: GP.textSoft, fontSize: 13 }}>
                Loading activity…
              </div>
            ) : timeline.length === 0 ? (
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
                            : item.severity === "warning"
                            ? GP.neonGold
                            : GP.neonBlue,
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      {item.action?.replace(/_/g, " ")}
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
                      {new Date(item.createdAt).toLocaleString()}
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
