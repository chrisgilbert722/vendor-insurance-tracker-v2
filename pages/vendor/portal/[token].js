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
  const [coiError, setCoiError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [parsedResult, setParsedResult] = useState(null);

  /* ==========================================================
     LOAD PORTAL DATA (Vendor + Org + Requirements)
  ========================================================== */
  useEffect(() => {
    if (!token) return;

    async function load() {
      try {
        setLoading(true);

        const res = await fetch(`/api/vendor/portal?token=${token}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Invalid vendor link");

        setVendorData(json);
      } catch (err) {
        console.error(err);
        setError(err.message || "Could not load vendor portal.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  /* ==========================================================
     FILE HANDLERS
  ========================================================== */
  async function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    await startUpload(f);
  }

  async function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    await startUpload(f);
  }

  /* ==========================================================
     UPLOAD + AI PARSE PIPELINE
  ========================================================== */
  async function startUpload(file) {
    try {
      setCoiError("");
      setUploadSuccess(false);

      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setCoiError("Only PDF files allowed.");
        return;
      }

      setUploading(true);

      // ------------------------------
      // 1) Upload PDF → Supabase
      // ------------------------------
      const form = new FormData();
      form.append("file", file);
      form.append("token", token);

      const uploadRes = await fetch("/api/vendor/upload-coi", {
        method: "POST",
        body: form,
      });

      const uploadJson = await uploadRes.json();
      if (!uploadJson.ok) throw new Error(uploadJson.error);

      const fileUrl = uploadJson.fileUrl;
      setUploadSuccess(true);

      // ------------------------------
      // 2) AI PARSE PDF → extract policies
      // ------------------------------
      const aiRes = await fetch("/api/vendor/ai/parse-coi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, fileUrl }),
      });

      const aiJson = await aiRes.json();
      if (!aiJson.ok) throw new Error(aiJson.error);

      setParsedResult(aiJson.result);

      // ------------------------------
      // 3) OPTIONAL: refresh portal status
      // ------------------------------
      const refresh = await fetch(`/api/vendor/portal?token=${token}`);
      const refreshed = await refresh.json();
      if (refreshed.ok) setVendorData(refreshed);

    } catch (err) {
      console.error(err);
      setCoiError(err.message);
    } finally {
      setUploading(false);
    }
  }

  /* ==========================================================
    LOADING / ERROR
  ========================================================== */
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "radial-gradient(circle at top left,#020617,#000)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: GP.textSoft,
          fontSize: 18,
        }}
      >
        Loading vendor portal…
      </div>
    );
  }

  if (error || !vendorData) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "radial-gradient(circle at top left,#020617,#000)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: GP.text,
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 50 }}>⚠️</div>
          <div style={{ fontSize: 18, marginTop: 8 }}>
            Invalid or expired vendor link.
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: GP.textSoft }}>
            Please contact the requesting organization for a new onboarding link.
          </div>
        </div>
      </div>
    );
  }

  const { vendor, org, requirements, status, alerts } = vendorData;

  /* ==========================================================
    MAIN UI
  ========================================================== */
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top left,#020617,#000)",
        padding: "32px 24px",
        color: GP.text,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          maxWidth: 1150,
          margin: "0 auto 24px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: GP.textSoft,
            }}
          >
            Vendor Compliance Portal
          </div>

          <h1
            style={{
              margin: 0,
              background:
                "linear-gradient(90deg,#38bdf8,#a855f7,#22c55e,#facc15)",
              WebkitBackgroundClip: "text",
              color: "transparent",
              fontSize: 28,
            }}
          >
            {vendor?.name}
          </h1>

          <div style={{ fontSize: 13, color: GP.textSoft }}>
            For {org?.name}
          </div>
        </div>

        {/* STATUS pill */}
        <div
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.6)",
            background: "rgba(15,23,42,0.96)",
            textAlign: "right",
          }}
        >
          <div style={{ fontSize: 10, textTransform: "uppercase" }}>
            Compliance Status
          </div>
          <div
            style={{
              color:
                status?.state === "compliant"
                  ? GP.neonGreen
                  : status?.state === "pending"
                  ? GP.neonGold
                  : GP.neonRed,
              fontWeight: 600,
            }}
          >
            {status?.label}
          </div>
        </div>
      </div>

      {/* GRID */}
      <div
        style={{
          maxWidth: 1150,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 24,
        }}
      >
        {/* LEFT SIDE — Upload + Requirements */}
        <div>
          {/* UPLOAD PANEL */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            style={{
              borderRadius: 22,
              padding: 22,
              background: GP.panel,
              border: `1px dashed ${GP.textSoft}55`,
              textAlign: "center",
              marginBottom: 22,
            }}
          >
            <h3 style={{ margin: 0, marginBottom: 8, color: GP.text }}>
              Upload Your COI
            </h3>

            <p style={{ fontSize: 13, color: GP.textSoft, marginBottom: 12 }}>
              Drag & drop a PDF or use the button below.
            </p>

            <label htmlFor="vendorCoi">
              <div
                style={{
                  padding: "8px 18px",
                  borderRadius: 999,
                  background:
                    "linear-gradient(90deg,#38bdf8,#0ea5e9,#0f172a)",
                  boxShadow: "0 0 12px #38bdf8aa",
                  border: "1px solid rgba(56,189,248,0.7)",
                  display: "inline-block",
                  cursor: "pointer",
                  color: "#e5f2ff",
                  fontSize: 13,
                }}
              >
                Choose COI File
              </div>
            </label>

            <input
              id="vendorCoi"
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {uploading && (
              <div style={{ marginTop: 12, color: GP.neonBlue }}>
                Uploading & analyzing…
              </div>
            )}

            {uploadSuccess && (
              <div
                style={{
                  marginTop: 12,
                  color: GP.neonGreen,
                  fontWeight: 600,
                }}
              >
                COI uploaded ✓
              </div>
            )}

            {coiError && (
              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  borderRadius: 10,
                  background: "rgba(127,29,29,0.8)",
                  color: "#fecaca",
                }}
              >
                {coiError}
              </div>
            )}
          </div>

          {/* REQUIREMENTS PANEL */}
          <div
            style={{
              borderRadius: 22,
              padding: 22,
              background: GP.panel,
              border: `1px solid ${GP.textSoft}35`,
            }}
          >
            <h3 style={{ marginTop: 0, color: GP.text }}>Required Coverage</h3>

            <ul
              style={{
                marginTop: 12,
                paddingLeft: 18,
                lineHeight: 1.7,
                color: GP.textSoft,
              }}
            >
              {requirements?.coverages?.length
                ? requirements.coverages.map((c, i) => (
                    <li key={i}>
                      <strong style={{ color: GP.text }}>{c.name}</strong>{" "}
                      {c.limit && `— ${c.limit}`}
                    </li>
                  ))
                : "No coverage requirements found."}
            </ul>
          </div>
        </div>

        {/* RIGHT SIDE — Status + Alerts + AI parse */}
        <div>
          {/* STATUS */}
          <div
            style={{
              borderRadius: 22,
              padding: 18,
              background: GP.panel,
              border: `1px solid ${GP.textSoft}35`,
              marginBottom: 22,
            }}
          >
            <h3 style={{ margin: 0, marginBottom: 8, color: GP.text }}>
              Your Current Status
            </h3>
            <p style={{ fontSize: 13, color: GP.textSoft }}>
              {status?.description ||
                "Upload your COI to generate a compliance review."}
            </p>
          </div>

          {/* ALERTS */}
          <div
            style={{
              borderRadius: 22,
              padding: 18,
              background: GP.panel,
              border: `1px solid ${GP.textSoft}35`,
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 8, color: GP.text }}>
              Issues Detected
            </h3>

            {parsedResult?.compliance ? (
              <ul style={{ paddingLeft: 18, color: GP.textSoft, fontSize: 13 }}>
                {parsedResult.compliance.missingCoverages?.map((m, i) => (
                  <li key={i} style={{ color: GP.neonRed }}>
                    Missing — {m}
                  </li>
                ))}

                {parsedResult.compliance.failedEndorsements?.map((m, i) => (
                  <li key={i} style={{ color: GP.neonGold }}>
                    Endorsement Missing — {m}
                  </li>
                ))}

                {parsedResult.compliance.expiringSoon?.length > 0 && (
                  <li style={{ color: GP.neonGold }}>
                    Expiring Soon — {parsedResult.compliance.expiringSoon.join(", ")}
                  </li>
                )}

                {parsedResult.compliance.overall === "pass" && (
                  <div style={{ color: GP.neonGreen }}>
                    ✓ All requirements satisfied
                  </div>
                )}
              </ul>
            ) : alerts?.length ? (
              <ul style={{ paddingLeft: 18, color: GP.textSoft }}>
                {alerts.map((a, i) => (
                  <li key={i}>{a.message}</li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: 13, color: GP.textSoft }}>
                No issues currently detected.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
