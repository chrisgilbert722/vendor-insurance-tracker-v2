// components/onboarding/VendorsUploadStep.js
// Wizard Step 2 — Vendor CSV / Excel Upload (Fully Autonomous, PM-First)

import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabaseClient";

/* -------------------------------------------------
   AI AUTO-DETECT + CONFIDENCE (PM-FIRST, SAFE)
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

    if (
      (n.includes("vendor") || n.includes("company") || n.includes("insured")) &&
      n.includes("name")
    ) assign("vendorName", h, 0.98);
    else if (n.includes("email")) assign("email", h, 0.98);
    else if (n.includes("phone") || n.includes("mobile") || n.includes("tel"))
      assign("phone", h, 0.95);
    else if (
      n.includes("category") ||
      n.includes("profession") ||
      n.includes("trade") ||
      n.includes("industry")
    ) assign("category", h, 0.9);
    else if (n.includes("carrier")) assign("carrier", h, 0.95);
    else if (
      n.includes("policytype") ||
      (n.includes("coverage") && n.includes("type"))
    ) assign("coverageType", h, 0.9);
    else if (
      n.includes("limit") ||
      n.includes("coverageamount") ||
      n.includes("eachoccurrence")
    ) assign("coverageAmount", h, 0.85);
    else if (
      n.includes("policynumber") ||
      (n.includes("policy") && n.includes("number"))
    ) assign("policyNumber", h, 0.98);
    else if (
      n.includes("expiration") ||
      n.includes("expire") ||
      n.includes("expdate"))
      assign("expiration", h, 0.97);
    else if (n.includes("address") || n.includes("street"))
      assign("address", h, 0.85);
    else if (n.includes("city")) assign("city", h, 0.9);
    else if (n === "state" || n.includes("province"))
      assign("state", h, 0.9);
    else if (n.includes("zip") || n.includes("postal"))
      assign("zip", h, 0.9);
  });

  return mapping;
}

function shouldAutoSkip(mapping) {
  return (
    mapping.vendorName?.confidence >= 0.9 &&
    mapping.policyNumber?.confidence >= 0.9 &&
    mapping.expiration?.confidence >= 0.9
  );
}

/* -------------------------------------------------
   COMPONENT
-------------------------------------------------- */
export default function VendorsUploadStep({ orgId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);

  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    setFile(f);
    parseFile(f);
  }

  function parseFile(file) {
    setParsing(true);

    const ext = file.name.split(".").pop().toLowerCase();

    if (ext === "csv") {
      parseCsv(file);
    } else if (ext === "xls" || ext === "xlsx") {
      parseExcel(file);
    } else {
      setError("Unsupported file type. Please upload CSV or Excel.");
      setParsing(false);
    }
  }

  function parseCsv(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (!lines.length) throw new Error("Empty CSV");

        const h = lines[0].split(",").map((x) => x.trim());
        const r = lines.slice(1).map((line) => {
          const cols = line.split(",");
          const obj = {};
          h.forEach((key, i) => (obj[key] = (cols[i] || "").trim()));
          return obj;
        });

        setHeaders(h);
        setRows(r);
      } catch {
        setError("There was a problem parsing the CSV file.");
      } finally {
        setParsing(false);
      }
    };
    reader.readAsText(file);
  }

  function parseExcel(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const json = XLSX.utils.sheet_to_json(sheet, {
          defval: "",
        });

        if (!json.length) throw new Error("Empty sheet");

        const h = Object.keys(json[0]);
        setHeaders(h);
        setRows(json);
      } catch {
        setError("There was a problem parsing the Excel file.");
      } finally {
        setParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleUpload(e) {
    e.preventDefault();
    setError("");

    if (!file || !rows.length) {
      setError("Please select a valid file before continuing.");
      return;
    }

    try {
      setUploading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Authentication session missing.");

      const fd = new FormData();
      fd.append("file", file);
      if (orgId) fd.append("orgId", String(orgId));

      const res = await fetch("/api/onboarding/upload-vendors-csv", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
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

      const mapping = detectMappingWithConfidence(headers);
      const autoSkip = shouldAutoSkip(mapping);

      onUploadSuccess?.({
        headers,
        rows,
        mapping,
        autoSkip,
      });
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleUpload}>
      <label
        style={{
          display: "block",
          padding: 20,
          borderRadius: 18,
          border: "1.5px dashed rgba(148,163,184,0.7)",
          background: "rgba(15,23,42,0.96)",
          cursor: "pointer",
          textAlign: "center",
        }}
      >
        <input
          type="file"
          accept=".csv,.xls,.xlsx"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <div style={{ fontSize: 14, color: "#e5e7eb" }}>
          {file ? file.name : "Upload vendor insurance file"}
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>
          CSV or Excel (.xls, .xlsx) — AI will handle the rest
        </div>
      </label>

      {(parsing || uploading) && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#a5b4fc" }}>
          {parsing ? "Reading your file…" : "AI is understanding your insurance data…"}
        </div>
      )}

      {error && <div style={{ color: "#fecaca", marginTop: 10 }}>{error}</div>}

      <button
        type="submit"
        disabled={uploading || parsing}
        style={{
          marginTop: 14,
          padding: "10px 18px",
          borderRadius: 999,
          border: "1px solid rgba(56,189,248,0.9)",
          background:
            "linear-gradient(90deg,rgba(56,189,248,0.9),rgba(88,28,135,0.85))",
          color: "#e5f2ff",
          fontWeight: 600,
          cursor: uploading || parsing ? "not-allowed" : "pointer",
        }}
      >
        {uploading ? "Analyzing…" : "Upload & Continue →"}
      </button>
    </form>
  );
}
