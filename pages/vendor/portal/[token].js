// SECTION 1/4 — imports, helpers, state, effects, handlers
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

function getTimelineIcon(item) {
  const action = (item.action || "").toLowerCase();

  if (action.includes("upload") || action.includes("coi")) return "📄";
  if (action.includes("parse") || action.includes("ai")) return "🤖";
  if (action.includes("fix") || action.includes("resolve")) return "🛠️";
  if (action.includes("status") || action.includes("state")) return "📊";
  if (action.includes("email") || action.includes("reminder")) return "✉️";

  if (item.severity === "critical") return "⚠️";
  if (item.severity === "warning") return "⚡";
  return "📌";
}

function getTimelineBucket(createdAtStr) {
  if (!createdAtStr) return "Older";
  const d = new Date(createdAtStr);
  if (isNaN(d.getTime())) return "Older";

  const now = new Date();

  function startOfDay(date) {
    const x = new Date(date);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  const todayStart = startOfDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const weekStart = new Date(todayStart);
  const dayOfWeek = weekStart.getDay(); // 0 = Sunday
  weekStart.setDate(weekStart.getDate() - dayOfWeek);

  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  if (d >= todayStart) return "Today";
  if (d >= yesterdayStart && d < todayStart) return "Yesterday";
  if (d >= weekStart) return "This Week";
  if (d >= lastWeekStart && d < weekStart) return "Last Week";
  if (d >= monthStart) return "This Month";
  return "Older";
}

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
  const [timelineFilter, setTimelineFilter] = useState("all");
  const [timelineSearch, setTimelineSearch] = useState("");

  // AI Assistant
  const [assistantMessages, setAssistantMessages] = useState([
    {
      role: "assistant",
      text: "Hi! I can help explain your requirements, issues, and what to fix to become compliant.",
    },
  ]);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState("");

  // Smart Suggestions
  const [smartSuggestions, setSmartSuggestions] = useState("");
  const [smartSuggestionsLoaded, setSmartSuggestionsLoaded] = useState(false);
  const [smartSuggestionsError, setSmartSuggestionsError] = useState("");
  const [smartSuggestionsLoading, setSmartSuggestionsLoading] = useState(false);

  // Responsive
  const [isMobile, setIsMobile] = useState(false);

  /* ============================================================
     RESPONSIVE DETECTION
  ============================================================ */
  useEffect(() => {
    function handleResize() {
      if (typeof window === "undefined") return;
      setIsMobile(window.innerWidth < 900);
    }
    handleResize();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

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

  const filteredTimeline = timeline.filter((item) => {
    const action = (item.action || "").toLowerCase();

    let passesFilter = true;
    switch (timelineFilter) {
      case "uploads":
        passesFilter = action.includes("upload") || action.includes("coi");
        break;
      case "ai":
        passesFilter = action.includes("parse") || action.includes("ai");
        break;
      case "fixes":
        passesFilter = action.includes("fix") || action.includes("resolve");
        break;
      case "status":
        passesFilter = action.includes("status") || action.includes("state");
        break;
      default:
        passesFilter = true;
    }
    if (!passesFilter) return false;

    const q = timelineSearch.trim().toLowerCase();
    if (!q) return true;

    const message = (item.message || "").toLowerCase();
    const severity = (item.severity || "").toLowerCase();
    const createdDate = item.createdAt
      ? new Date(item.createdAt).toLocaleString().toLowerCase()
      : "";

    return (
      action.includes(q) ||
      message.includes(q) ||
      severity.includes(q) ||
      createdDate.includes(q)
    );
  });

  const bucketOrder = ["Today", "Yesterday", "This Week", "Last Week", "This Month", "Older"];

  const groupedTimeline = bucketOrder
    .map((label) => ({
      label,
      items: filteredTimeline.filter(
        (item) => getTimelineBucket(item.createdAt) === label
      ),
    }))
    .filter((group) => group.items.length > 0);

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
     SMART SUGGESTIONS HANDLER
  ============================================================ */
  async function loadSmartSuggestions() {
    if (!token || smartSuggestionsLoading) return;

    try {
      setSmartSuggestionsError("");
      setSmartSuggestionsLoading(true);

      const res = await fetch("/api/vendor/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const json = await res.json();
      if (!json.ok || !json.suggestions) {
        throw new Error(json.error || "Failed to load suggestions.");
      }

      setSmartSuggestions(json.suggestions);
      setSmartSuggestionsLoaded(true);
    } catch (err) {
      console.error("[smart suggestions]", err);
      setSmartSuggestionsError("Could not generate suggestions. Please try again.");
      setSmartSuggestionsLoaded(false);
    } finally {
      setSmartSuggestionsLoading(false);
    }
  }

  /* ============================================================
     AI ASSISTANT HANDLER
  ============================================================ */
  async function handleAssistantSend() {
    const question = assistantInput.trim();
    if (!question || !token) return;

    setAssistantError("");
    setAssistantLoading(true);
    setAssistantInput("");

    const newMessages = [
      ...assistantMessages,
      { role: "user", text: question },
    ];
    setAssistantMessages(newMessages);

    try {
      const res = await fetch("/api/vendor/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          question,
        }),
      });

      const json = await res.json();
      if (!json.ok || !json.reply) {
        throw new Error(json.error || "Assistant is unavailable.");
      }

      setAssistantMessages((prev) => [
        ...prev,
        { role: "assistant", text: json.reply },
      ]);
    } catch (err) {
      console.error("[assistant] failed:", err);
      setAssistantError(
        "I'm having trouble responding right now. Please try again in a moment."
      );
      setAssistantMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            "Sorry — I'm having trouble reaching the compliance assistant right now. You can still review your issues and requirements above.",
        },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  }

  function handleAssistantKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!assistantLoading) {
        handleAssistantSend();
      }
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
// SECTION 2/4 — top-level layout + LEFT column (upload + AI summary)
  /* ============================================================
     MAIN UI
  ============================================================ */
  return (
    <div
      style={{
        minHeight: "100vh",
        background: GP.bg,
        padding: isMobile ? "20px 14px" : "32px 24px",
        color: GP.text,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          maxWidth: 1150,
          margin: "0 auto 24px auto",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          gap: isMobile ? 12 : 0,
        }}
      >
        <div>
          <div style={{ fontSize: 12, textTransform: "uppercase", color: GP.textSoft }}>
            Vendor Compliance Portal
          </div>

          <h1
            style={{
              margin: "4px 0",
              fontSize: isMobile ? 24 : 28,
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
            alignSelf: isMobile ? "flex-start" : "center",
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
          gridTemplateColumns: isMobile
            ? "minmax(0,1fr)"
            : "minmax(0,1.7fr) minmax(0,1.1fr)",
          gap: 24,
        }}
      >
        {/* LEFT SIDE — Upload + AI Summary */}
        <div>
          {/* UPLOAD PANEL */}
          <div
            style={{
              borderRadius: 20,
              padding: isMobile ? 16 : 20,
              border: `1px dashed ${GP.border}`,
              background: "rgba(15,23,42,0.92)",
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <h3 style={{ marginTop: 0, fontSize: isMobile ? 16 : 18 }}>Upload COI PDF</h3>

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
                  fontSize: 13,
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
                  fontSize: 12,
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
                  fontSize: 12,
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
                fontSize: 13,
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
                padding: isMobile ? 16 : 20,
                border: `1px solid ${GP.border}`,
                background: "rgba(15,23,42,0.92)",
                boxShadow: "0 0 35px rgba(56,189,248,0.15)",
              }}
            >
              <h3 style={{ marginTop: 0, fontSize: isMobile ? 16 : 18 }}>AI COI Summary</h3>

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
                <div style={{ marginBottom: 4 }}>
                  <strong style={{ color: GP.neonBlue }}>AI Notes:</strong>
                  <p style={{ fontSize: 13, color: GP.textSoft, marginTop: 4 }}>
                    {ai.observations}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
// SECTION 3/4 — RIGHT column: Smart Suggestions + Fix Issues + Requirements + Timeline
        {/* RIGHT SIDE — Smart Suggestions + Fix Issues + Requirements + Timeline + Assistant */}
        <div>
          {/* SMART SUGGESTIONS PANEL */}
          <div
            style={{
              borderRadius: 20,
              padding: isMobile ? 16 : 18,
              border: `1px solid ${GP.border}`,
              background: "rgba(15,23,42,0.96)",
              marginBottom: 24,
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: isMobile ? 16 : 18 }}>
              Smart Suggestions
            </h3>
            <div
              style={{
                fontSize: 11,
                color: GP.textSoft,
                marginBottom: 8,
                opacity: 0.85,
              }}
            >
              Automatic guidance based on your requirements, issues, and recent activity.
            </div>

            {!smartSuggestionsLoaded && !smartSuggestionsLoading ? (
              <button
                onClick={loadSmartSuggestions}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: `1px solid ${GP.neonBlue}`,
                  background: "linear-gradient(135deg,#38bdf8,#0ea5e9)",
                  color: "#0b1120",
                  fontSize: 13,
                  cursor: "pointer",
                  marginTop: 4,
                }}
              >
                Generate Suggestions →
              </button>
            ) : smartSuggestionsLoading ? (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: GP.textSoft,
                }}
              >
                Generating suggestions…
              </div>
            ) : smartSuggestionsError ? (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: "#fecaca",
                }}
              >
                {smartSuggestionsError}
              </div>
            ) : (
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: 13,
                  color: GP.textSoft,
                  marginTop: 6,
                  lineHeight: 1.45,
                  borderRadius: 12,
                  padding: 12,
                  background: "rgba(2,6,23,0.6)",
                  border: "1px solid rgba(148,163,184,0.3)",
                }}
              >
                {smartSuggestions}
              </div>
            )}
          </div>

          {/* FIX MODE BLOCK */}
          <div
            style={{
              borderRadius: 20,
              padding: isMobile ? 16 : 18,
              border: `1px solid ${GP.border}`,
              background: "rgba(15,23,42,0.92)",
              marginBottom: 24,
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: isMobile ? 16 : 18 }}>Fix Issues</h3>
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
              <div style={{ color: GP.textSoft, fontSize: 13 }}>No issues detected.</div>
            )}
          </div>

          {/* REQUIREMENTS BLOCK */}
          <div
            style={{
              borderRadius: 20,
              padding: isMobile ? 16 : 18,
              border: `1px solid ${GP.border}`,
              background: "rgba(15,23,42,0.92)",
              marginBottom: 24,
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: isMobile ? 16 : 18 }}>
              Coverage Requirements
            </h3>
            <ul style={{ paddingLeft: 18, fontSize: 13 }}>
              {(requirements?.coverages || []).map((c, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  <strong>{c.name}</strong> {c.limit && `— ${c.limit}`}
                </li>
              ))}
            </ul>
          </div>

          {/* ACTIVITY TIMELINE PANEL */}
          <div
            style={{
              borderRadius: 20,
              padding: isMobile ? 16 : 18,
              border: `1px solid ${GP.border}`,
              background: "rgba(15,23,42,0.92)",
              marginTop: 0,
              marginBottom: 24,
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: isMobile ? 16 : 18 }}>Recent Activity</h3>

            {/* SEARCH + FILTER ROW */}
            <div
              style={{
                marginTop: 10,
                marginBottom: 14,
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                flexWrap: "wrap",
                gap: 10,
                alignItems: isMobile ? "stretch" : "center",
              }}
            >
              {/* FILTER BUTTONS */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  flex: isMobile ? "0 0 auto" : "0 0 auto",
                }}
              >
                {[
                  { id: "all", label: "All" },
                  { id: "uploads", label: "Uploads" },
                  { id: "ai", label: "AI & Parsing" },
                  { id: "fixes", label: "Fixes" },
                  { id: "status", label: "Status & System" },
                ].map((f) => {
                  const active = timelineFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setTimelineFilter(f.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        cursor: "pointer",
                        border: active
                          ? `1px solid ${GP.neonBlue}`
                          : "1px solid rgba(148,163,184,0.35)",
                        background: active
                          ? "linear-gradient(90deg,#38bdf8,#0ea5e9)"
                          : "rgba(15,23,42,0.9)",
                        color: active ? "#0b1120" : GP.textSoft,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {/* SEARCH INPUT */}
              <div
                style={{
                  flex: 1,
                  minWidth: isMobile ? "100%" : 180,
                }}
              >
                <div
                  style={{
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 13,
                      opacity: 0.6,
                    }}
                  >
                    🔍
                  </span>
                  <input
                    type="text"
                    value={timelineSearch}
                    onChange={(e) => setTimelineSearch(e.target.value)}
                    placeholder='Search: "upload", "critical", "renewal"…'
                    style={{
                      width: "100%",
                      padding: "7px 10px 7px 30px",
                      borderRadius: 999,
                      border: "1px solid rgba(148,163,184,0.55)",
                      background: "rgba(15,23,42,0.95)",
                      color: GP.text,
                      fontSize: 11,
                      outline: "none",
                    }}
                  />
                </div>
              </div>
            </div>

            {loadingTimeline ? (
              <div style={{ color: GP.textSoft, fontSize: 13 }}>
                Loading activity…
              </div>
            ) : timeline.length === 0 ? (
              <div style={{ color: GP.textSoft, fontSize: 13 }}>
                No recent activity logged.
              </div>
            ) : filteredTimeline.length === 0 ? (
              <div style={{ color: GP.textSoft, fontSize: 13 }}>
                No events match this filter or search yet. Try adjusting your filters.
              </div>
            ) : (
              groupedTimeline.map((group, groupIndex) => (
                <div
                  key={group.label}
                  className="vendor-timeline-group"
                  style={{ marginBottom: 18 }}
                >
                  <div
                    className="vendor-timeline-divider"
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 1.2,
                      color: GP.textSoft,
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      animationDelay: `${groupIndex * 80}ms`,
                    }}
                  >
                    <span
                      style={{
                        height: 1,
                        flex: 1,
                        background:
                          "linear-gradient(90deg,rgba(148,163,184,0.1),rgba(148,163,184,0.6))",
                      }}
                    />
                    <span>{group.label}</span>
                    <span
                      style={{
                        height: 1,
                        flex: 1,
                        background:
                          "linear-gradient(90deg,rgba(148,163,184,0.6),rgba(148,163,184,0.1))",
                      }}
                    />
                  </div>

                  <ul style={{ paddingLeft: 0, listStyle: "none", margin: 0 }}>
                    {group.items.map((item, i) => {
                      const critical = item.severity === "critical";
                      const warning = item.severity === "warning";
                      const itemClassNames = [
                        "vendor-timeline-item",
                        critical ? "vendor-timeline-critical" : "",
                        warning ? "vendor-timeline-warning" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <li
                          key={i}
                          className={itemClassNames}
                          style={{
                            marginBottom: 14,
                            padding: 12,
                            borderRadius: 14,
                            background: "rgba(2,6,23,0.6)",
                            border: "1px solid rgba(148,163,184,0.28)",
                            display: "flex",
                            gap: 10,
                            animationDelay: `${(groupIndex * 80) + i * 40}ms`,
                          }}
                        >
                          {/* ICON COLUMN */}
                          <div
                            style={{
                              fontSize: 18,
                              display: "flex",
                              alignItems: "flex-start",
                              paddingTop: 2,
                            }}
                          >
                            {getTimelineIcon(item)}
                          </div>

                          {/* TEXT COLUMN */}
                          <div style={{ flex: 1 }}>
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
                                letterSpacing: 0.4,
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
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
// SECTION 4/4 — AI Assistant panel + global styles + closing
          {/* AI ASSISTANT PANEL */}
          <div
            style={{
              borderRadius: 20,
              padding: isMobile ? 16 : 18,
              border: `1px solid ${GP.border}`,
              background: "rgba(15,23,42,0.96)",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "999px",
                    background:
                      "radial-gradient(circle at 30% 0,#38bdf8,#22c55e,#0f172a)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                  }}
                >
                  🤖
                </span>
                <div>
                  <div
                    style={{
                      fontSize: isMobile ? 14 : 15,
                      fontWeight: 600,
                    }}
                  >
                    Ask the Compliance Assistant
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: GP.textSoft,
                      opacity: 0.8,
                    }}
                  >
                    Get quick help on issues, requirements, and what to fix.
                  </div>
                </div>
              </div>
            </div>

            {/* CHAT WINDOW */}
            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(148,163,184,0.35)",
                background: "rgba(15,23,42,0.98)",
                padding: 10,
                maxHeight: 220,
                overflowY: "auto",
                marginBottom: 10,
              }}
            >
              {assistantMessages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 8,
                    display: "flex",
                    justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "6px 10px",
                      borderRadius:
                        m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      fontSize: 12,
                      lineHeight: 1.45,
                      background:
                        m.role === "user"
                          ? "linear-gradient(135deg,#38bdf8,#0ea5e9)"
                          : "rgba(15,23,42,0.96)",
                      color: m.role === "user" ? "#0b1120" : GP.textSoft,
                      border:
                        m.role === "user"
                          ? "1px solid rgba(56,189,248,0.7)"
                          : "1px solid rgba(148,163,184,0.45)",
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {assistantLoading && (
                <div
                  style={{
                    fontSize: 11,
                    color: GP.textSoft,
                    opacity: 0.8,
                    marginTop: 2,
                  }}
                >
                  Assistant is thinking…
                </div>
              )}
            </div>

            {assistantError && (
              <div
                style={{
                  fontSize: 11,
                  color: "#fecaca",
                  marginBottom: 6,
                }}
              >
                {assistantError}
              </div>
            )}

            {/* INPUT ROW */}
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <textarea
                rows={1}
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                onKeyDown={handleAssistantKeyDown}
                placeholder='Ask: "What am I missing?", "Why am I non-compliant?"…'
                style={{
                  flex: 1,
                  resize: "none",
                  padding: "7px 9px",
                  borderRadius: 10,
                  border: "1px solid rgba(148,163,184,0.6)",
                  background: "rgba(15,23,42,0.98)",
                  color: GP.text,
                  fontSize: 11,
                  outline: "none",
                  minHeight: 34,
                  maxHeight: 64,
                }}
              />
              <button
                type="button"
                onClick={handleAssistantSend}
                disabled={assistantLoading || !assistantInput.trim()}
                style={{
                  padding: "7px 12px",
                  borderRadius: 999,
                  border: `1px solid ${
                    assistantLoading || !assistantInput.trim()
                      ? "rgba(148,163,184,0.5)"
                      : GP.neonBlue
                  }`,
                  background:
                    assistantLoading || !assistantInput.trim()
                      ? "rgba(15,23,42,0.8)"
                      : "linear-gradient(135deg,#38bdf8,#0ea5e9)",
                  color: assistantLoading || !assistantInput.trim() ? GP.textSoft : "#0b1120",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor:
                    assistantLoading || !assistantInput.trim()
                      ? "not-allowed"
                      : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {assistantLoading ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes vpFadeSlideIn {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes vpDividerReveal {
          0% {
            opacity: 0;
            transform: translateY(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes vpNeonPulseRed {
          0% {
            box-shadow: 0 0 0 rgba(248, 113, 113, 0);
          }
          50% {
            box-shadow: 0 0 16px rgba(248, 113, 113, 0.4);
          }
          100% {
            box-shadow: 0 0 0 rgba(248, 113, 113, 0);
          }
        }

        @keyframes vpNeonPulseGold {
          0% {
            box-shadow: 0 0 0 rgba(250, 204, 21, 0);
          }
          50% {
            box-shadow: 0 0 14px rgba(250, 204, 21, 0.35);
          }
          100% {
            box-shadow: 0 0 0 rgba(250, 204, 21, 0);
          }
        }

        .vendor-timeline-divider {
          opacity: 0;
          transform: translateY(4px);
          animation-name: vpDividerReveal;
          animation-duration: 0.4s;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
        }

        .vendor-timeline-item {
          opacity: 0;
          transform: translateY(6px);
          animation-name: vpFadeSlideIn;
          animation-duration: 0.45s;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
        }

        .vendor-timeline-critical {
          animation-name: vpFadeSlideIn, vpNeonPulseRed;
          animation-duration: 0.45s, 1.6s;
          animation-timing-function: ease-out, ease-out;
          animation-iteration-count: 1, 2;
          animation-fill-mode: forwards, none;
        }

        .vendor-timeline-warning {
          animation-name: vpFadeSlideIn, vpNeonPulseGold;
          animation-duration: 0.45s, 1.6s;
          animation-timing-function: ease-out, ease-out;
          animation-iteration-count: 1, 1;
          animation-fill-mode: forwards, none;
        }
      `}</style>
    </div>
  );
}
