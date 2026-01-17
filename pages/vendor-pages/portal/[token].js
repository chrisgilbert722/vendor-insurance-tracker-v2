// pages/vendor/portal/[token].js
// Vendor Portal V8 — COI Upload + Multi-Doc Upload + AI Summary
// + Fix Mode + Timeline + Smart Suggestions + AI Assistant
// + Document Viewer V8 (Modal, Clause Highlights, Expiry Bars, Hints)

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

// Derive vendor-level status if backend doesn't provide one
function computeDerivedStatus(status, alerts, policies) {
  if (status && status.state && status.label) return status;

  const normAlerts = Array.isArray(alerts) ? alerts : [];
  const hasCritical = normAlerts.some((a) => {
    const sev = String(a.severity || "").toLowerCase();
    return sev === "critical" || sev === "high";
  });

  if (hasCritical) {
    return { state: "non_compliant", label: "Non-Compliant" };
  }

  if (Array.isArray(policies) && policies.length > 0) {
    return { state: "compliant", label: "Compliant" };
  }

  return { state: "pending", label: "Pending Review" };
}

// Document utilities
function getDocumentIcon(type) {
  const t = (type || "").toLowerCase();
  if (t === "w9") return "🧾";
  if (t === "license") return "🪪";
  if (t === "contract") return "📜";
  if (t === "endorsement") return "🧩";
  return "📄";
}

function getDocStyle(type) {
  const t = (type || "").toLowerCase();

  if (t === "w9")
    return { color: "#38bdf8", glow: "0 0 12px rgba(56,189,248,0.5)" };

  if (t === "license")
    return { color: "#facc15", glow: "0 0 12px rgba(250,204,21,0.45)" };

  if (t === "contract")
    return { color: "#a855f7", glow: "0 0 14px rgba(168,85,247,0.45)" };

  if (t === "endorsement")
    return { color: "#22c55e", glow: "0 0 14px rgba(34,197,94,0.45)" };

  return { color: "#9ca3af", glow: "0 0 12px rgba(156,163,175,0.3)" };
}

function extractExpiration(aiJson) {
  if (!aiJson) return null;

  const raw =
    aiJson.normalized?.expiration ||
    aiJson.normalized?.expire_date ||
    aiJson.normalized?.expires ||
    aiJson.normalized?.expiry;

  if (!raw) return null;

  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function getDocStatus(type, aiJson) {
  const t = (type || "").toLowerCase();
  const exp = extractExpiration(aiJson);

  if (t === "license" && exp) {
    const now = new Date();
    const daysLeft = Math.floor((exp - now) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return { label: "Expired", color: GP.neonRed, daysLeft };
    if (daysLeft <= 30)
      return { label: "Expiring Soon", color: GP.neonGold, daysLeft };
    return { label: "Valid", color: GP.neonGreen, daysLeft };
  }

  return { label: "Uploaded", color: GP.textSoft, daysLeft: null };
}

function getSummaryHighlights(summary = "") {
  if (!summary) return [];

  const lines = summary
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.filter((l) => l.length > 6).slice(0, 3);
}

function computeMissingDocHints(docs = []) {
  const types = new Set(docs.map((d) => (d.document_type || "").toLowerCase()));
  const hints = [];

  if (!types.has("w9")) hints.push("W-9 form");
  if (!types.has("license")) hints.push("Business license");
  if (!types.has("contract")) hints.push("Executed contract");
  if (!types.has("endorsement")) hints.push("Additional insured endorsement");

  return hints;
}

export default function VendorPortal() {
  const router = useRouter();
  const { token } = router.query;

  // Core data
  const [loading, setLoading] = useState(true);
  const [vendorData, setVendorData] = useState(null);
  const [error, setError] = useState("");

  // COI upload
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  // Multi-document upload
  const [docType, setDocType] = useState("w9");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docUploadError, setDocUploadError] = useState("");
  const [docUploadSuccess, setDocUploadSuccess] = useState("");

  // Documents & timeline
  const [vendorDocuments, setVendorDocuments] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [timelineFilter, setTimelineFilter] = useState("all");
  const [timelineSearch, setTimelineSearch] = useState("");

  // Fix mode
  const [resolvedCodes, setResolvedCodes] = useState([]);

  // AI Assistant
  const [assistantMessages, setAssistantMessages] = useState([
    {
      role: "assistant",
      text:
        "Hi! I can help explain your requirements, issues, and what to fix to become compliant.",
    },
  ]);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState("");

  // Smart suggestions
  const [smartSuggestions, setSmartSuggestions] = useState("");
  const [smartSuggestionsLoaded, setSmartSuggestionsLoaded] = useState(false);
  const [smartSuggestionsError, setSmartSuggestionsError] = useState("");
  const [smartSuggestionsLoading, setSmartSuggestionsLoading] = useState(false);

  // Responsive
  const [isMobile, setIsMobile] = useState(false);

  // Document viewer modal
  const [viewerDoc, setViewerDoc] = useState(null);
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
     LOAD PORTAL DATA (vendor, alerts, policies, ai, requirements)
  ============================================================ */
  useEffect(() => {
    if (!token) return;

    async function loadPortal() {
      try {
        setLoading(true);

        const res = await fetch(`/api/vendor-portal/portal?token=${token}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Invalid link");

        setVendorData(json);

        // Load fix-mode saved state
        const saved = localStorage.getItem(`vendor_fix_${token}`);
        if (saved) setResolvedCodes(JSON.parse(saved));
      } catch (err) {
        setError(err.message || "Could not load vendor portal.");
      } finally {
        setLoading(false);
      }
    }

    loadPortal();
  }, [token]);

  /* ============================================================
     LOAD VENDOR DOCUMENTS
  ============================================================ */
  useEffect(() => {
    if (!token) return;

    async function loadDocs() {
      try {
        const res = await fetch(`/api/vendor-portal/documents?token=${token}`);
        const json = await res.json();
        if (json.ok) setVendorDocuments(json.documents || []);
      } catch (err) {
        console.error("[vendor documents] failed:", err);
      }
    }

    loadDocs();
  }, [token]);

  /* ============================================================
     LOAD ACTIVITY TIMELINE
  ============================================================ */
  useEffect(() => {
    if (!token) return;

    async function loadTimeline() {
      try {
        setLoadingTimeline(true);
        const res = await fetch(`/api/vendor-portal/timeline?token=${token}`);
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
     FILTER + SEARCH TIMELINE LOGIC
  ============================================================ */
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

  /* ============================================================
     GROUP TIMELINE BY TIME BUCKETS
  ============================================================ */
  const bucketOrder = [
    "Today",
    "Yesterday",
    "This Week",
    "Last Week",
    "This Month",
    "Older",
  ];

  const groupedTimeline = bucketOrder
    .map((label) => ({
      label,
      items: filteredTimeline.filter(
        (item) => getTimelineBucket(item.createdAt) === label
      ),
    }))
    .filter((group) => group.items.length > 0);
  /* ============================================================
     FIX MODE — PERSIST RESOLVED STATE
  ============================================================ */
  async function toggleResolved(code) {
    const updated = resolvedCodes.includes(code)
      ? resolvedCodes.filter((c) => c !== code)
      : [...resolvedCodes, code];

    setResolvedCodes(updated);
    localStorage.setItem(`vendor_fix_${token}`, JSON.stringify(updated));

    try {
      await fetch("/api/vendor-portal/fix-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, code }),
      });

      const res = await fetch(`/api/vendor-portal/portal?token=${token}`);
      const json = await res.json();
      if (json.ok) setVendorData(json);
    } catch (err) {
      console.error("Fix-issue failed:", err);
    }
  }

  /* ============================================================
     COI FILE INPUT HANDLING
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

  /* Drag-and-drop support */
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
     COI UPLOAD → /api/vendor/upload-coi
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

      const res = await fetch("/api/vendor-portal/upload-coi", {
        method: "POST",
        body: fd,
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Upload failed");

      setUploadSuccess("Uploaded! Parsing your COI…");

      // Update UI with new AI results + alerts
      setVendorData((prev) => ({
        ...prev,
        ai: json.ai || prev?.ai,
        alerts: json.alerts || prev?.alerts,
        status: {
          state: json.status || prev?.status?.state,
          label:
            (json.status || prev?.status?.state || "pending").toUpperCase(),
        },
      }));

      // Refresh documents + timeline automatically
      try {
        const docsRes = await fetch(`/api/vendor-portal/documents?token=${token}`);
        const docsJson = await docsRes.json();
        if (docsJson.ok) setVendorDocuments(docsJson.documents || []);

        const tRes = await fetch(`/api/vendor-portal/timeline?token=${token}`);
        const tJson = await tRes.json();
        if (tJson.ok) setTimeline(tJson.timeline || []);
      } catch (_) {}

      setTimeout(() => setUploadSuccess("COI analyzed successfully!"), 800);
    } catch (err) {
      setUploadError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  /* ============================================================
     MULTI-DOCUMENT UPLOAD INPUT HANDLING (W9, license, contract, etc.)
  ============================================================ */
  function handleDocInput(e) {
    const f = e.target.files?.[0];
    if (!f) return;

    const ext = f.name.toLowerCase().split(".").pop();
    const allowed = ["pdf", "png", "jpg", "jpeg"];

    if (!allowed.includes(ext)) {
      setDocUploadError("Only PDF, PNG, JPG, JPEG allowed.");
      return;
    }

    setSelectedDoc(f);
    setDocUploadError("");
    setDocUploadSuccess("");
  }

  /* ============================================================
     MULTI-DOCUMENT UPLOAD → /api/vendor/upload-doc
  ============================================================ */
  async function handleDocUpload() {
    if (!selectedDoc) {
      setDocUploadError("Please choose a document first.");
      return;
    }

    try {
      setDocUploading(true);
      setDocUploadError("");
      setDocUploadSuccess("");

      const fd = new FormData();
      fd.append("file", selectedDoc);
      fd.append("token", token);
      fd.append("docType", docType);

      const res = await fetch("/api/vendor-portal/upload-doc", {
        method: "POST",
        body: fd,
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Document upload failed");

      setDocUploadSuccess(`Uploaded ${docType.toUpperCase()} successfully!`);

      // Refresh documents + timeline
      try {
        const docsRes = await fetch(`/api/vendor-portal/documents?token=${token}`);
        const docsJson = await docsRes.json();
        if (docsJson.ok) setVendorDocuments(docsJson.documents || []);

        const tRes = await fetch(`/api/vendor-portal/timeline?token=${token}`);
        const tJson = await tRes.json();
        if (tJson.ok) setTimeline(tJson.timeline || []);
      } catch (_) {}

      setSelectedDoc(null);
    } catch (err) {
      setDocUploadError(err.message || "Document upload failed.");
    } finally {
      setDocUploading(false);
    }
  }

  /* ============================================================
     SMART SUGGESTIONS → /api/vendor/suggestions
  ============================================================ */
  async function loadSmartSuggestions() {
    if (!token || smartSuggestionsLoading) return;

    try {
      setSmartSuggestionsError("");
      setSmartSuggestionsLoading(true);

      const res = await fetch("/api/vendor-portal/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const json = await res.json();
      if (!json.ok || !json.suggestions)
        throw new Error(json.error || "Failed to load suggestions.");

      setSmartSuggestions(json.suggestions);
      setSmartSuggestionsLoaded(true);
    } catch (err) {
      setSmartSuggestionsError("Could not generate suggestions. Please try again.");
      setSmartSuggestionsLoaded(false);
    } finally {
      setSmartSuggestionsLoading(false);
    }
  }

  /* ============================================================
     AI ASSISTANT → /api/vendor/assistant
  ============================================================ */
  async function handleAssistantSend() {
    const question = assistantInput.trim();
    if (!question || !token) return;

    setAssistantError("");
    setAssistantLoading(true);
    setAssistantInput("");

    setAssistantMessages((prev) => [...prev, { role: "user", text: question }]);

    try {
      const res = await fetch("/api/vendor-portal/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, question }),
      });

      const json = await res.json();
      if (!json.ok || !json.reply)
        throw new Error(json.error || "Assistant unavailable.");

      setAssistantMessages((prev) => [
        ...prev,
        { role: "assistant", text: json.reply },
      ]);
    } catch (err) {
      setAssistantError("I'm having trouble responding right now.");
      setAssistantMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            "Sorry — I'm having trouble reaching your compliance assistant right now. You can still review your issues and requirements above.",
        },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  }

  function handleAssistantKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!assistantLoading) handleAssistantSend();
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

  const { vendor, org, requirements, alerts, status, ai, policies } = vendorData;

  const vendorName =
    vendor?.vendor_name || vendor?.name || "Your Company";

  const orgName =
    org?.name ||
    vendorData.orgName ||
    "Your Customer";

  const derivedStatus = computeDerivedStatus(
    status,
    alerts,
    policies || []
  );

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
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              color: GP.textSoft,
            }}
          >
            Vendor Compliance Portal
          </div>

          <h1
            style={{
              margin: "4px 0",
              fontSize: isMobile ? 24 : 28,
              background:
                "linear-gradient(90deg,#38bdf8,#a855f7,#22c55e)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            {vendorName}
          </h1>

          <div style={{ fontSize: 13, color: GP.textSoft }}>
            For {orgName}
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
                derivedStatus.state === "compliant"
                  ? GP.neonGreen
                  : derivedStatus.state === "pending"
                  ? GP.neonGold
                  : GP.neonRed,
            }}
          >
            {derivedStatus.label}
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
        {/* ---------------------------------------------------------
             LEFT SIDE — COI Upload + Multi-Doc Upload + AI Summary
        --------------------------------------------------------- */}
        <div>
          {/* COI UPLOAD PANEL */}
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
            <h3 style={{ marginTop: 0, fontSize: isMobile ? 16 : 18 }}>
              Upload COI
            </h3>

            <input
              id="coiUpload"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/jpg"
              capture="environment"
              style={{ display: "none" }}
              onChange={handleFileInput}
            />

            <label htmlFor="coiUpload">
              <div
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  background:
                    "linear-gradient(90deg,#38bdf8,#0ea5e9)",
                  cursor: "pointer",
                  display: "inline-block",
                  fontSize: 13,
                }}
              >
                Choose File
              </div>
            </label>

            {selectedFile && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: GP.neonBlue,
                }}
              >
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
                background:
                  "linear-gradient(90deg,#38bdf8,#0ea5e9)",
                color: "#e5f2ff",
                cursor: uploading ? "not-allowed" : "pointer",
                fontSize: 13,
              }}
            >
              {uploading
                ? "Uploading & Analyzing…"
                : "Upload & Analyze COI →"}
            </button>
          </div>

          {/* ---------------------------------------------------------
             MULTI-DOCUMENT UPLOAD PANEL (W9, License, Contract, Other)
          --------------------------------------------------------- */}
          <div
            style={{
              marginTop: 24,
              borderRadius: 20,
              padding: isMobile ? 16 : 20,
              border: `1px solid ${GP.border}`,
              background: "rgba(15,23,42,0.92)",
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: isMobile ? 16 : 18 }}>
              Upload Additional Documents
            </h3>

            <div
              style={{
                fontSize: 12,
                color: GP.textSoft,
                marginBottom: 12,
              }}
            >
              Upload W-9s, business licenses, contracts, endorsements, or other
              compliance documents.
            </div>

            {/* Document type selector */}
            <label
              style={{
                fontSize: 12,
                marginBottom: 6,
                display: "block",
              }}
            >
              Document Type
            </label>

            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: `1px solid ${GP.border}`,
                background: "rgba(2,6,23,0.8)",
                color: GP.text,
                fontSize: 12,
                marginBottom: 12,
                outline: "none",
                width: "100%",
              }}
            >
              <option value="w9">W-9 Form</option>
              <option value="license">Business License</option>
              <option value="contract">Contract</option>
              <option value="endorsement">Endorsement PDF</option>
              <option value="other">Other Document</option>
            </select>

            {/* File input */}
            <input
              id="multiDocUpload"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              style={{ display: "none" }}
              onChange={handleDocInput}
            />

            <label htmlFor="multiDocUpload">
              <div
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  background:
                    "linear-gradient(90deg,#38bdf8,#0ea5e9)",
                  cursor: "pointer",
                  display: "inline-block",
                  fontSize: 13,
                }}
              >
                Choose File
              </div>
            </label>

            {selectedDoc && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: GP.neonBlue,
                }}
              >
                Selected: {selectedDoc.name}
              </div>
            )}

            {docUploadError && (
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
                {docUploadError}
              </div>
            )}

            {docUploadSuccess && (
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
                {docUploadSuccess}
              </div>
            )}

            <button
              onClick={handleDocUpload}
              disabled={docUploading}
              style={{
                marginTop: 18,
                padding: "10px 18px",
                borderRadius: 999,
                border: `1px solid ${GP.neonBlue}`,
                background:
                  "linear-gradient(90deg,#38bdf8,#0ea5e9)",
                color: "#e5f2ff",
                cursor: docUploading ? "not-allowed" : "pointer",
                fontSize: 13,
                width: "100%",
              }}
            >
              {docUploading ? "Uploading Document…" : "Upload Document →"}
            </button>
          </div>

          {/* ---------------------------------------------------------
             AI COI SUMMARY PANEL
          --------------------------------------------------------- */}
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
              <h3 style={{ marginTop: 0, fontSize: isMobile ? 16 : 18 }}>
                AI COI Summary
              </h3>

              {ai.brokerStyle && (
                <div style={{ marginBottom: 14 }}>
                  <strong style={{ color: GP.neonBlue }}>
                    Broker Style:
                  </strong>
                  <div style={{ fontSize: 13, color: GP.textSoft }}>
                    {ai.brokerStyle}
                  </div>
                </div>
              )}

              {ai.policyTypes && (
                <div style={{ marginBottom: 14 }}>
                  <strong style={{ color: GP.neonBlue }}>
                    Detected Policies:
                  </strong>
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
                  <strong style={{ color: GP.neonBlue }}>
                    Extracted Limits:
                  </strong>
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
                            {k}:{" "}
                            <span style={{ color: GP.neonGold }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {ai.endorsements?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <strong style={{ color: GP.neonBlue }}>
                    Endorsements:
                  </strong>
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
                  <p
                    style={{
                      fontSize: 13,
                      color: GP.textSoft,
                      marginTop: 4,
                    }}
                  >
                    {ai.observations}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        {/* ---------------------------------------------------------
             RIGHT SIDE — Docs Viewer + Smart Suggestions + Fix Issues + Requirements + Timeline + Assistant
        --------------------------------------------------------- */}
        <div>
          {/* DOCUMENT VIEWER PANEL — V8 */}
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
              Uploaded Documents
            </h3>

            {/* Missing doc hints */}
            {(() => {
              const hints = computeMissingDocHints(vendorDocuments);
              if (!hints.length) return null;
              return (
                <div
                  style={{
                    fontSize: 12,
                    color: "#fed7aa",
                    background: "rgba(124,45,18,0.35)",
                    borderRadius: 10,
                    padding: 10,
                    border: "1px solid rgba(249,115,22,0.6)",
                    marginBottom: 12,
                  }}
                >
                  <strong>Recommended to upload:</strong>{" "}
                  {hints.join(", ")}
                </div>
              );
            })()}

            <div style={{ fontSize: 12, color: GP.textSoft, marginBottom: 10 }}>
              W-9s, licenses, contracts, endorsements, and other compliance documents.
            </div>

            {vendorDocuments.length === 0 ? (
              <div style={{ fontSize: 13, color: GP.textSoft }}>
                No additional documents uploaded yet.
              </div>
            ) : (
              <div
                style={{
                  maxHeight: 260,
                  overflowY: "auto",
                  paddingRight: 6,
                }}
              >
                {vendorDocuments.map((doc) => {
                  const style = getDocStyle(doc.document_type);
                  const status = getDocStatus(doc.document_type, doc.ai_json);
                  const highlights = getSummaryHighlights(doc.ai_json?.summary);

                  return (
                    <div
                      key={doc.id}
                      style={{
                        padding: 14,
                        borderRadius: 16,
                        background: "rgba(2,6,23,0.65)",
                        border: `1px solid ${style.color}55`,
                        marginBottom: 16,
                        boxShadow: style.glow,
                        animation: "vpFadeSlideIn 0.4s ease-out",
                      }}
                    >
                      {/* Header Row */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 10,
                        }}
                      >
                        {/* Icon + Title */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span style={{ fontSize: 22 }}>
                            {getDocumentIcon(doc.document_type)}
                          </span>

                          <div>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                textTransform: "uppercase",
                                color: style.color,
                              }}
                            >
                              {doc.document_type}
                            </div>

                            <div
                              style={{
                                fontSize: 11,
                                color: GP.textSoft,
                              }}
                            >
                              Uploaded:{" "}
                              {doc.uploaded_at
                                ? new Date(doc.uploaded_at).toLocaleString()
                                : "—"}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setViewerDoc(doc)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 999,
                              fontSize: 11,
                              border: `1px solid ${style.color}`,
                              background: "transparent",
                              color: style.color,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Open Viewer
                          </button>
                        </div>
                      </div>

                      {/* Status + Expiry */}
                      <div style={{ marginTop: 8 }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 9px",
                            borderRadius: 999,
                            border: `1px solid ${status.color}AA`,
                            color: status.color,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {status.label}
                        </span>

                        {status.daysLeft != null && (
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 10,
                              color: GP.textSoft,
                            }}
                          >
                            {status.daysLeft < 0
                              ? `Expired ${Math.abs(
                                  status.daysLeft
                                )} day(s) ago`
                              : `Expires in ${status.daysLeft} day(s)`}

                            <div
                              style={{
                                marginTop: 4,
                                height: 4,
                                borderRadius: 999,
                                background: "rgba(15,23,42,1)",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      (status.daysLeft / 365) * 100
                                    )
                                  )}%`,
                                  background:
                                    status.label === "Expired"
                                      ? GP.neonRed
                                      : status.label === "Expiring Soon"
                                      ? GP.neonGold
                                      : GP.neonGreen,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* AI Summary Highlights */}
                      {highlights.length > 0 && (
                        <div
                          style={{
                            marginTop: 10,
                            background: "rgba(15,23,42,0.7)",
                            borderRadius: 12,
                            padding: 10,
                            border:
                              "1px solid rgba(148,163,184,0.35)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              color: GP.textSoft,
                              marginBottom: 4,
                              opacity: 0.85,
                            }}
                          >
                            AI Highlights:
                          </div>
                          {highlights.map((line, i) => (
                            <div
                              key={i}
                              style={{
                                fontSize: 12,
                                color: GP.textSoft,
                                marginBottom: 4,
                                display: "flex",
                                gap: 6,
                                alignItems: "flex-start",
                              }}
                            >
                              <span style={{ color: style.color }}>
                                •
                              </span>
                              <span>{line}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
              Automatic guidance based on your requirements, issues, and recent
              activity.
            </div>

            {!smartSuggestionsLoaded && !smartSuggestionsLoading ? (
              <button
                onClick={loadSmartSuggestions}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: `1px solid ${GP.neonBlue}`,
                  background:
                    "linear-gradient(135deg,#38bdf8,#0ea5e9)",
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
            <h3 style={{ marginTop: 0, fontSize: isMobile ? 16 : 18 }}>
              Fix Issues
            </h3>
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
                    <div
                      style={{
                        fontSize: 12,
                        color: GP.textSoft,
                        marginTop: 4,
                      }}
                    >
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
              <div style={{ color: GP.textSoft, fontSize: 13 }}>
                No issues detected.
              </div>
            )}
          </div>

          {/* REQUIREMENTS BLOCK — gracefully skip if not provided */}
          {requirements?.coverages?.length > 0 && (
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
                {(requirements.coverages || []).map((c, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    <strong>{c.name}</strong>{" "}
                    {c.limit && `— ${c.limit}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
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
            <h3 style={{ marginTop: 0, fontSize: isMobile ? 16 : 18 }}>
              Recent Activity
            </h3>

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
                No events match this filter or search yet. Try adjusting your
                filters.
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

                  <ul
                    style={{
                      paddingLeft: 0,
                      listStyle: "none",
                      margin: 0,
                    }}
                  >
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
                            border:
                              "1px solid rgba(148,163,184,0.28)",
                            display: "flex",
                            gap: 10,
                            animationDelay: `${
                              groupIndex * 80 + i * 40
                            }ms`,
                          }}
                        >
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
                            <div
                              style={{
                                fontSize: 13,
                                color: GP.textSoft,
                              }}
                            >
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
                              {item.createdAt
                                ? new Date(
                                    item.createdAt
                                  ).toLocaleString()
                                : ""}
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
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
                    justifyContent:
                      m.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "6px 10px",
                      borderRadius:
                        m.role === "user"
                          ? "16px 16px 4px 16px"
                          : "16px 16px 16px 4px",
                      fontSize: 12,
                      lineHeight: 1.45,
                      background:
                        m.role === "user"
                          ? "linear-gradient(135deg,#38bdf8,#0ea5e9)"
                          : "rgba(15,23,42,0.96)",
                      color:
                        m.role === "user" ? "#0b1120" : GP.textSoft,
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
                  color:
                    assistantLoading || !assistantInput.trim()
                      ? GP.textSoft
                      : "#0b1120",
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

      {/* FULLSCREEN DOCUMENT VIEWER MODAL */}
      {viewerDoc && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.95)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(148,163,184,0.4)",
              background:
                "linear-gradient(90deg,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 20 }}>
                {getDocumentIcon(viewerDoc.document_type)}
              </span>
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    color: "#e5e7eb",
                  }}
                >
                  {viewerDoc.document_type}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: GP.textSoft,
                  }}
                >
                  {viewerDoc.uploaded_at
                    ? new Date(
                        viewerDoc.uploaded_at
                      ).toLocaleString()
                    : ""}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewerDoc(null)}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.5)",
                background: "rgba(15,23,42,0.9)",
                color: GP.textSoft,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Close ✕
            </button>
          </div>

          <div
            style={{
              flex: 1,
              background: "#000",
              overflow: "hidden",
            }}
          >
            <iframe
              src={viewerDoc.file_url}
              style={{
                border: "none",
                width: "100%",
                height: "100%",
              }}
              title="Document Viewer"
            />
          </div>
        </div>
      )}

      {/* GLOBAL ANIMATIONS FOR TIMELINE & DOCS */}
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
