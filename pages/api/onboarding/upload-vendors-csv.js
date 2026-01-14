// components/onboarding/VendorsUploadStep.js
// Wizard Step 2 — Vendor File Upload (SESSION-SAFE, FAIL-OPEN)

import { useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

/* -------------------------------------------------
   AI AUTO-DETECT + CONFIDENCE (BEST EFFORT)
-------------------------------------------------- */
function detectMappingWithConfidence(headers = []) {
  const normalize = (s) =>
    String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const mapping = {};
  const assign = (key, column, confidence) => {
    if (!mapping[key]) {
      mapping[key] = { column, confidence, source: "ai" };
    }
  };

  headers.forEach((h) => {
    const n = normalize(h);
    if (n.includes("vendor") && n.includes("name")) assign("vendorName", h, 0.95);
    else if (n.includes("email")) assign("email", h, 0.95);
    else if (n.includes("expiration")) assign("expiration", h, 0.9);
    else if (n.includes("policy") && n.includes("number"))
      assign("policyNumber", h, 0.95);
  });

  return mapping;
}

function shouldAutoSkip(mapping) {
  return Boolean(
    mapping.vendorName &&
      mapping.policyNumber &&
      mapping.expiration
  );
}

/* -------------------------------------------------
   COMPONENT
-------------------------------------------------- */
export default function VendorsUploadStep({ orgId, onUploadSuccess }) {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    setFile(f);
  }

  async function handleUpload() {
    console.log("[UPLOAD CLICKED]", { file, orgId });

    if (!file || uploading) return;

    setUploading(true);
    setError("");

    try {
      // 🔑 GET SUPABASE SESSION (THIS WAS MISSING)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Session not ready yet. Please try again.");
      }

      const fd = new FormData();
      fd.append("file", file);
      fd.append("orgId", String(orgId));

      const res = await fetch("/api/onboarding/upload-vendors-csv", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`, // ✅ REQUIRED
        },
        body: fd,
      });

      const json = await res.json();
      console.log("[UPLOAD RESPONSE]", json);

      if (!json.ok) {
        throw new Error(json.error || "Upload failed");
      }

      const headers = Array.isArray(json.headers) ? json.headers : [];
      const rows = Array.isArray(json.rows) ? json.rows : [];

      // 🔓 FAIL-OPEN: allow wizard to continue even if empty
      if (!rows.length) {
        onUploadSuccess?.({
          headers,
          rows: [],
          mapping: {},
          autoSkip: true,
        });
        return;
      }

      const mapping = detectMappingWithConfidence(headers);
      const autoSkip = shouldAutoSkip(mapping);

      onUploadSuccess?.({ headers, rows, mapping, autoSkip });
    } catch (err) {
      console.error("[UPLOAD ERROR]", err);
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xls,.xlsx"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {/* File picker */}
      <div
        onClick={() => fileInputRef.current?.click()}
        style={{
          padding: 20,
          borderRadius: 18,
          border: "1.5px dashed rgba(148,163,184,0.7)",
          background: "rgba(15,23,42,0.96)",
          cursor: "pointer",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 14, color: "#e5e7eb" }}>
          {file ? file.name : "Upload vendor insurance file"}
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>
          CSV or Excel (.xls, .xlsx)
        </div>
      </div>

      {error && <div style={{ color: "#fecaca", marginTop: 10 }}>{error}</div>}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        style={{
          marginTop: 16,
          padding: "12px 22px",
          borderRadius: 999,
          border: "1px solid rgba(56,189,248,0.9)",
          background:
            "linear-gradient(90deg,rgba(56,189,248,0.9),rgba(88,28,135,0.85))",
          color: "#e5f2ff",
          fontWeight: 600,
          cursor: !file || uploading ? "not-allowed" : "pointer",
        }}
      >
        {uploading ? "Uploading…" : "Upload & Continue →"}
      </button>
    </div>
  );
}
