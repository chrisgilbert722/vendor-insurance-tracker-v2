// pages/vendor/index.js
// ==========================================================
// Vendor Portal V4 — AI-Powered Cockpit with Fix Mode
// Vendor sees requirements, alerts, uploads COIs and gets
// AI-driven explanations of what's missing / wrong.
// ==========================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import ToastV2 from "../../components/ToastV2";
import CockpitWizardLayout from "../../components/CockpitWizardLayout";

export default function VendorPortalPage() {
  const router = useRouter();
  const { token } = router.query;

  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState(null);
  const [requirements, setRequirements] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [uploading, setUploading] = useState(false);

  // AI Fix Mode state
  const [fixLoading, setFixLoading] = useState(false);
  const [fixSummary, setFixSummary] = useState("");
  const [fixIssues, setFixIssues] = useState([]);

  const [toast, setToast] = useState({
    open: false,
    type: "success",
    message: "",
  });

  // -----------------------------------------------------------
  // LOAD PORTAL DATA
  // -----------------------------------------------------------
  useEffect(() => {
    if (!token) return;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/vendor/portal-init?token=${token}`);
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Failed to load portal.");
        }
        setVendor(json.vendor);
        setRequirements(json.requirements);
        setAlerts(json.alerts || []);
        setSummary(json.summary || null);
      } catch (err) {
        console.error(err);
        setToast({
          open: true,
          type: "error",
          message: err.message || "Could not load vendor portal.",
        });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  // -----------------------------------------------------------
  // HANDLE COI UPLOAD
  // -----------------------------------------------------------
  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return setToast({
        open: true,
        type: "error",
        message: "Please upload a PDF COI file.",
      });
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("token", token);

      const res = await fetch("/api/vendor/upload-coi", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Upload failed.");
      }

      setToast({
        open: true,
        type: "success",
        message: "COI uploaded successfully. Our system is reviewing it.",
      });

      // Optional: re-run AI Fix Mode automatically later
    } catch (err) {
      console.error(err);
      setToast({
        open: true,
        type: "error",
        message: err.message || "COI upload failed.",
      });
    } finally {
      setUploading(false);
    }
  }

  // -----------------------------------------------------------
  // AI FIX MODE: RUN ANALYSIS
  // -----------------------------------------------------------
  async function runAiFixAnalysis() {
    if (!token) {
      return setToast({
        open: true,
        type: "error",
        message: "Missing token. Please reload your link.",
      });
    }

    try {
      setFixLoading(true);
      setFixSummary("");
      setFixIssues([]);

      const res = await fetch("/api/vendor/ai-fix-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "AI Fix Mode failed.");
      }

      setFixSummary(json.summary || "");
      setFixIssues(Array.isArray(json.issues) ? json.issues : []);

      setToast({
        open: true,
        type: "success",
        message: "AI Fix analysis complete.",
      });
    } catch (err) {
      console.error(err);
      setToast({
        open: true,
        type: "error",
        message: err.message || "AI Fix Mode failed.",
      });
    } finally {
      setFixLoading(false);
    }
  }

  // -----------------------------------------------------------
  // COPY BROKER EMAIL TEXT
  // -----------------------------------------------------------
  function copyBrokerEmail(emailText) {
    if (!emailText) return;
    try {
      navigator.clipboard.writeText(emailText);
      setToast({
        open: true,
        type: "success",
        message: "Text copied — paste into an email to your broker.",
      });
    } catch (err) {
      console.error(err);
      setToast({
        open: true,
        type: "error",
        message: "Could not copy text. Please copy manually.",
      });
    }
  }

  // -----------------------------------------------------------
  // RENDER HELPERS
  // -----------------------------------------------------------
  function renderRequirements() {
    if (!requirements) {
      return (
        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          Your requirements profile is being prepared. If this persists, please
          contact your client.
        </div>
      );
    }

    return (
      <div
        style={{
          fontSize: 12,
          color: "#e5e7eb",
          background: "rgba(15,23,42,0.9)",
          borderRadius: 12,
          border: "1px solid rgba(148,163,184,0.4)",
          padding: 12,
          maxHeight: 260,
          overflowY: "auto",
        }}
      >
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
{JSON.stringify(requirements, null, 2)}
        </pre>
      </div>
    );
  }

  function renderAlerts() {
    if (!alerts.length) {
      return (
        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          ✅ No active issues detected at this time.
        </div>
      );
    }

    return (
      <div
        style={{
          fontSize: 12,
          color: "#e5e7eb",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {alerts.map((a) => (
          <div
            key={a.id}
            style={{
              borderRadius: 10,
              padding: 8,
              background: "rgba(15,23,42,0.95)",
              border:
                (a.severity || "").toLowerCase() === "critical"
                  ? "1px solid rgba(239,68,68,0.8)"
                  : "1px solid rgba(234,179,8,0.7)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              {a.title || "Alert"}
            </div>
            <div style={{ fontSize: 12, color: "#cbd5f5" }}>{a.message}</div>
          </div>
        ))}
      </div>
    );
  }

  function renderFixMode() {
    return (
      <div
        style={{
          marginTop: 18,
          padding: 18,
          borderRadius: 18,
          background: "rgba(15,23,42,0.9)",
          border: "1px solid rgba(80,120,255,0.45)",
          boxShadow:
            "0 0 30px rgba(64,106,255,0.35), inset 0 0 20px rgba(15,23,42,0.95)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          🧠 AI Fix Mode
        </div>
        <p
          style={{
            fontSize: 12,
            color: "#9ca3af",
            marginBottom: 10,
          }}
        >
          AI will compare your most recent COI against the requirements and
          explain what needs to be fixed. You can copy the suggested wording and
          send it directly to your insurance broker.
        </p>

        <button
          onClick={runAiFixAnalysis}
          disabled={fixLoading}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            background: fixLoading
              ? "rgba(56,189,248,0.35)"
              : "linear-gradient(90deg,#38bdf8,#0ea5e9)",
            border: "1px solid rgba(56,189,248,0.8)",
            color: "white",
            cursor: fixLoading ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          {fixLoading ? "Analyzing COI…" : "⚡ Run AI Fix Analysis"}
        </button>

        {fixSummary && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 12,
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(148,163,184,0.6)",
              fontSize: 12,
              color: "#e5e7eb",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Summary</div>
            <div>{fixSummary}</div>
          </div>
        )}

        {fixIssues.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Detected Issues
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {fixIssues.map((issue, idx) => {
                const severityColor =
                  issue.severity === "critical"
                    ? "#ef4444"
                    : issue.severity === "high"
                    ? "#f97316"
                    : issue.severity === "medium"
                    ? "#facc15"
                    : "#22c55e";

                return (
                  <div
                    key={idx}
                    style={{
                      borderRadius: 12,
                      padding: 10,
                      background: "rgba(15,23,42,0.96)",
                      border: `1px solid ${severityColor}80`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#e5e7eb",
                        }}
                      >
                        {issue.field || "Issue"}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 999,
                          border: `1px solid ${severityColor}`,
                          color: severityColor,
                        }}
                      >
                        {(issue.severity || "").toUpperCase()}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#9ca3af",
                        marginBottom: 4,
                      }}
                    >
                      <strong>Required:</strong> {issue.requirement || "—"}
                      <br />
                      <strong>COI Shows:</strong> {issue.actual || "Not found"}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#e5e7eb",
                        marginBottom: 6,
                      }}
                    >
                      {issue.explanation}
                    </div>
                    {issue.broker_email && (
                      <button
                        onClick={() => copyBrokerEmail(issue.broker_email)}
                        style={{
                          fontSize: 11,
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid rgba(56,189,248,0.8)",
                          background: "rgba(15,23,42,0.95)",
                          color: "#7dd3fc",
                          cursor: "pointer",
                        }}
                      >
                        📧 Copy Email Text for Broker
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // -----------------------------------------------------------
  // MAIN RENDER
  // -----------------------------------------------------------
  return (
    <CockpitWizardLayout>
      <div style={{ position: "relative", zIndex: 3 }}>
        {loading ? (
          <div style={{ padding: 40, fontSize: 14 }}>Loading portal…</div>
        ) : !vendor ? (
          <div
            style={{
              padding: 24,
              borderRadius: 18,
              background: "rgba(15,23,42,0.9)",
              border: "1px solid rgba(148,163,184,0.5)",
              fontSize: 14,
              color: "#fca5a5",
            }}
          >
            We could not find a vendor associated with this link. Please contact
            your client for a new upload link.
          </div>
        ) : (
          <>
            <h1
              style={{
                fontSize: 26,
                marginBottom: 8,
                background: "linear-gradient(90deg,#38bdf8,#a855f7,#e5e7eb)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              Insurance Upload Portal
            </h1>
            <p style={{ color: "#9ca3af", marginBottom: 16, fontSize: 13 }}>
              Hi{" "}
              <span style={{ color: "#e5e7eb" }}>
                {vendor.vendor_name || "there"}
              </span>
              , use this page to upload your Certificate of Insurance and review
              your current requirements.
            </p>

            {/* GRID LAYOUT */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1.4fr)",
                gap: 20,
                alignItems: "flex-start",
              }}
            >
              {/* LEFT: REQUIREMENTS + ALERTS + AI FIX MODE */}
              <div>
                {/* REQUIREMENTS PANEL */}
                <div
                  style={{
                    marginBottom: 18,
                    padding: 18,
                    borderRadius: 18,
                    background: "rgba(15,23,42,0.82)",
                    border: "1px solid rgba(80,120,255,0.35)",
                    boxShadow:
                      "0 0 28px rgba(64,106,255,0.28), inset 0 0 18px rgba(15,23,42,0.9)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    Your Insurance Requirements
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#9ca3af",
                      marginBottom: 8,
                    }}
                  >
                    These requirements describe the coverage limits, policies,
                    and endorsements requested by your client.
                  </p>
                  {renderRequirements()}
                </div>

                {/* ALERTS PANEL */}
                <div
                  style={{
                    padding: 18,
                    borderRadius: 18,
                    background: "rgba(15,23,42,0.82)",
                    border: "1px solid rgba(148,163,184,0.45)",
                    boxShadow:
                      "0 0 24px rgba(30,64,175,0.25), inset 0 0 14px rgba(15,23,42,0.9)",
                    backdropFilter: "blur(8px)",
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    Current Status & Alerts
                  </div>
                  {summary && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#9ca3af",
                        marginBottom: 10,
                      }}
                    >
                      Open alerts:{" "}
                      <span style={{ color: "#e5e7eb" }}>
                        {summary.openAlertCount}
                      </span>{" "}
                      · Critical:{" "}
                      <span
                        style={{
                          color: summary.hasCriticalAlerts
                            ? "#f97373"
                            : "#4ade80",
                        }}
                      >
                        {summary.hasCriticalAlerts ? "Yes" : "No"}
                      </span>
                    </div>
                  )}
                  {renderAlerts()}
                </div>

                {/* AI FIX MODE PANEL */}
                {renderFixMode()}
              </div>

              {/* RIGHT: UPLOAD PANEL */}
              <div>
                <div
                  style={{
                    padding: 20,
                    borderRadius: 22,
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(80,120,255,0.45)",
                    boxShadow:
                      "0 0 30px rgba(64,106,255,0.35), inset 0 0 22px rgba(15,23,42,0.95)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      marginBottom: 10,
                    }}
                  >
                    Upload Your Certificate of Insurance (COI)
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#9ca3af",
                      marginBottom: 12,
                    }}
                  >
                    Please upload a current, signed PDF copy of your Certificate
                    of Insurance. Our system will automatically review it
                    against your requirements.
                  </p>

                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    disabled={uploading}
                    style={{
                      width: "100%",
                      marginBottom: 12,
                      fontSize: 13,
                    }}
                  />

                  <button
                    disabled={uploading}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      borderRadius: 12,
                      background: uploading
                        ? "rgba(56,189,248,0.35)"
                        : "linear-gradient(90deg,#38bdf8,#0ea5e9)",
                      border: "1px solid rgba(56,189,248,0.8)",
                      color: "white",
                      cursor: uploading ? "not-allowed" : "pointer",
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {uploading ? "Uploading…" : "📄 Upload COI"}
                  </button>

                  {vendor.last_uploaded_coi && (
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 12,
                        color: "#9ca3af",
                      }}
                    >
                      Last uploaded COI:{" "}
                      <span style={{ color: "#e5e7eb" }}>
                        {vendor.last_uploaded_at
                          ? new Date(
                              vendor.last_uploaded_at
                            ).toLocaleDateString()
                          : "date not available"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <ToastV2
          open={toast.open}
          type={toast.type}
          message={toast.message}
          onClose={() =>
            setToast((prev) => ({
              ...prev,
              open: false,
            }))
          }
        />
      </div>
    </CockpitWizardLayout>
  );
}
