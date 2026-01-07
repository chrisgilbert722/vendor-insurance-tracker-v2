// components/onboarding/VendorsUploadStep.js
// Wizard Step 2 — Vendor CSV Upload (AI Auto-Detect + Backend gate release)

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

/* -------------------------------------------------
   AI AUTO-DETECT COLUMN MAPPING (FULL COVERAGE)
-------------------------------------------------- */
function autoDetectMapping(headers = []) {
  const normalize = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const mapping = {};

  headers.forEach((h) => {
    const n = normalize(h);

    if (!mapping.vendorName && (n.includes("vendor") || n.includes("company") || n.includes("insured")) && n.includes("name")) {
      mapping.vendorName = h; return;
    }
    if (!mapping.email && n.includes("email")) {
      mapping.email = h; return;
    }
    if (!mapping.phone && (n.includes("phone") || n.includes("mobile") || n.includes("tel"))) {
      mapping.phone = h; return;
    }
    if (!mapping.category && (n.includes("category") || n.includes("profession") || n.includes("trade") || n.includes("industry"))) {
      mapping.category = h; return;
    }
    if (!mapping.carrier && n.includes("carrier")) {
      mapping.carrier = h; return;
    }
    if (!mapping.coverageType && (n.includes("policytype") || (n.includes("coverage") && n.includes("type")))) {
      mapping.coverageType = h; return;
    }
    if (!mapping.coverageAmount && (n.includes("limit") || n.includes("coverageamount") || n.includes("eachoccurrence"))) {
      mapping.coverageAmount = h; return;
    }
    if (!mapping.policyNumber && (n.includes("policynumber") || (n.includes("policy") && n.includes("number")))) {
      mapping.policyNumber = h; return;
    }
    if (!mapping.expiration && (n.includes("expiration") || n.includes("expire") || n.includes("expdate"))) {
      mapping.expiration = h; return;
    }
    if (!mapping.address && (n.includes("address") || n.includes("street"))) {
      mapping.address = h; return;
    }
    if (!mapping.city && n.includes("city")) {
      mapping.city = h; return;
    }
    if (!mapping.state && (n === "state" || n.includes("province"))) {
      mapping.state = h; return;
    }
    if (!mapping.zip && (n.includes("zip") || n.includes("postal"))) {
      mapping.zip = h; return;
    }
  });

  return mapping;
}

export default function VendorsUploadStep({ orgId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [parsedRows, setParsedRows] = useState([]);

  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    setFile(f);
    parseCsvFile(f);
  }

  function parseCsvFile(f) {
    setParsing(true);
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (!lines.length) throw new Error("Empty CSV");

        const headers = lines[0].split(",").map((h) => h.trim());
        const rows = lines.slice(1).map((line) => {
          const cols = line.split(",");
          const obj = {};
          headers.forEach((h, i) => (obj[h || `col_${i}`] = (cols[i] || "").trim()));
          return obj;
        });

        setPreviewHeaders(headers);
        setPreviewRows(rows.slice(0, 5));
        setParsedRows(rows);
      } catch {
        setError("There was a problem parsing the CSV file.");
      } finally {
        setParsing(false);
      }
    };

    reader.onerror = () => {
      setError("Failed to read CSV file.");
      setParsing(false);
    };

    reader.readAsText(f);
  }

  async function handleUpload(e) {
    e.preventDefault();
    setError("");

    if (!file || !parsedRows.length) {
      setError("Please select a valid CSV file before continuing.");
      return;
    }

    try {
      setUploading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Auth session missing.");

      const formData = new FormData();
      formData.append("file", file);
      if (orgId) formData.append("orgId", String(orgId));

      const res = await fetch("/api/onboarding/upload-vendors-csv", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Upload failed.");

      await fetch("/api/onboarding/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orgId }),
      });

      const autoMapping = autoDetectMapping(previewHeaders);

      onUploadSuccess?.({
        headers: previewHeaders,
        rows: parsedRows,
        autoMapping,
      });
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleUpload}>
      <label style={{ display: "block", padding: 20, borderRadius: 18, border: "1.5px dashed rgba(148,163,184,0.7)", background: "rgba(15,23,42,0.96)", cursor: "pointer", textAlign: "center" }}>
        <input type="file" accept=".csv" onChange={handleFileChange} style={{ display: "none" }} />
        <div style={{ fontSize: 14, color: "#e5e7eb" }}>{file ? file.name : "Upload vendors.csv"}</div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>CSV only — vendor list + policy data</div>
      </label>

      {(parsing || uploading) && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#a5b4fc" }}>
          {parsing ? "Reading your file…" : "AI is analyzing your vendor policies…"}
        </div>
      )}

      <button type="submit" disabled={uploading || parsing} style={{ marginTop: 14, padding: "10px 18px", borderRadius: 999 }}>
        {uploading ? "Analyzing…" : "Upload & Analyze →"}
      </button>
    </form>
  );
}
