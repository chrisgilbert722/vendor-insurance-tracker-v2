import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

// ⭐ REPLACED LUCIDE WITH TABLER ICONS
import {
  IconUpload,
  IconLoader2,
  IconAlertTriangle,
  IconCircleCheck,
  IconFileText,
} from "@tabler/icons-react";

const STEP_LABELS = [
  "Uploading file",
  "Extracting fields",
  "Validating coverage",
  "Analyzing risk",
];

export default function UploadCOI() {
  const router = useRouter();

  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [debugResponse, setDebugResponse] = useState("");

  const [dragActive, setDragActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState("");

  // 🔐 Auth check
  useEffect(() => {
    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) router.push("/auth/login");
    }
    checkAuth();
  }, [router]);

  const reset = () => {
    setError("");
    setSuccess("");
    setDebugResponse("");
    setResult(null);
    setStatus("idle");
    setStepIndex(-1);
    setFileName("");
    setFile(null);
  };

  async function processFile(selectedFile) {
    if (!selectedFile) return;

    reset();
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setStatus("working");
    setStepIndex(0);

    try {
      const form = new FormData();
      form.append("file", selectedFile);

      setTimeout(() => setStepIndex(1), 250);

      const res = await fetch("/api/extract-coi", {
        method: "POST",
        body: form,
      });

      const contentType = res.headers.get("content-type") || "";
      let data;

      if (contentType.includes("application/json")) {
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Extraction failed");
      } else {
        const text = await res.text();
        throw new Error("Server returned invalid data:\n" + text.slice(0, 200));
      }

      setDebugResponse(JSON.stringify(data, null, 2));

      setTimeout(() => setStepIndex(2), 350);
      setTimeout(() => {
        setStepIndex(3);
        setTimeout(() => {
          setSuccess("Upload successful!");
          setStatus("done");
          setResult(data);
        }, 350);
      }, 700);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Unknown error");
      setStatus("error");
      setStepIndex(-1);
    }
  }

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  const handleBrowse = (e) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const riskColor = (score) => {
    if (typeof score !== "number")
      return "bg-slate-100 text-slate-700 border-slate-200";
    if (score >= 80) return "bg-green-100 text-green-700 border-green-200";
    if (score >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* HEADER */}
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            G-Track · Vendor COI Automation
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Upload Certificate of Insurance
          </h1>
          <p className="text-slate-600 text-sm max-w-2xl">
            Drag &amp; drop a COI PDF. AI will extract carrier, limits,
            expiration, flags, and risk score.
          </p>
        </header>

        <div className="grid md:grid-cols-[3fr_2fr] gap-6">
          {/* LEFT SIDE */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            {/* Upload Box */}
            <div
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={handleDrop}
              className={`py-10 px-6 rounded-xl border-2 border-dashed cursor-pointer transition
                ${
                  dragActive
                    ? "border-blue-500 bg-blue-50/80"
                    : "border-slate-300 bg-slate-100/70 hover:bg-slate-200/60"
                }`}
            >
              <label htmlFor="fileInput" className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 bg-blue-600 rounded-full text-white flex items-center justify-center shadow-sm">
                  <IconUpload className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-slate-900">
                    Drag &amp; drop PDF here
                  </p>
                  <p className="text-sm text-slate-500">
                    or{" "}
                    <span className="text-blue-600 font-semibold">
                      browse files
                    </span>
                  </p>
                  {fileName && (
                    <p className="text-xs text-slate-500 mt-1">
                      Selected: <span className="font-semibold">{fileName}</span>
                    </p>
                  )}
                </div>
              </label>

              <input
                id="fileInput"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleBrowse}
              />
            </div>

            {/* Pipeline */}
            <div>
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                AI Processing Pipeline
              </h2>
              <ol className="space-y-2">
                {STEP_LABELS.map((label, idx) => {
                  const active = stepIndex === idx && status === "working";
                  const done = stepIndex > idx && status === "done";
                  return (
                    <li key={label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-6 w-6 rounded-full border flex items-center justify-center text-[11px]
                          ${
                            done
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : active
                              ? "border-blue-500 bg-blue-50 text-blue-600"
                              : "border-slate-300 bg-white text-slate-400"
                          }`}
                        >
                          {done ? (
                            <IconCircleCheck className="h-4 w-4" />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <span
                          className={
                            active
                              ? "text-slate-900"
                              : done
                              ? "text-slate-700"
                              : "text-slate-500"
                          }
                        >
                          {label}
                        </span>
                      </div>
                      {active && (
                        <IconLoader2 className="h-4 w-4 animate-spin text-blue-500" />
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Statuses */}
            {status === "working" && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <IconLoader2 className="h-3 w-3 animate-spin" />
                <span>AI engine is processing your certificate…</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2">
                <IconAlertTriangle className="h-4 w-4 mt-0.5" />
                <div>
                  <p className="font-semibold">Upload failed</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {success && (
              <p className="text-sm text-emerald-600 flex items-center gap-2">
                <IconCircleCheck className="h-4 w-4" /> {success}
              </p>
            )}
          </section>

          {/* RIGHT SIDE SUMMARY */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                <IconFileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  COI Summary
                </p>
                <p className="text-xs text-slate-500">
                  AI-parsed carrier, policy, coverage, and risk snapshot.
                </p>
              </div>
            </div>

            {/* EMPTY */}
            {!result && status === "idle" && (
              <p className="text-sm text-slate-500">
                Upload a certificate to see extracted details and risk scoring.
              </p>
            )}

            {/* LOADING */}
            {!result && status === "working" && (
              <div className="space-y-3">
                <div className="h-4 w-40 rounded-full bg-slate-100 animate-pulse" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-16 rounded-xl bg-slate-100 animate-pulse" />
                  <div className="h-16 rounded-xl bg-slate-100 animate-pulse" />
                  <div className="h-16 rounded-xl bg-slate-100 animate-pulse" />
                  <div className="h-16 rounded-xl bg-slate-100 animate-pulse" />
                </div>
              </div>
            )}

            {/* RESULT */}
            {result && (
              <div className="space-y-4 text-sm">

                {/* Top line */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Carrier · Policy
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {result.carrier || "—"} ·{" "}
                      {result.policy_number || result.policyNumber || "—"}
                    </p>
                  </div>

                  {typeof result.riskScore === "number" && (
                    <div
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${riskColor(
                        result.riskScore
                      )}`}
                    >
                      <span>Risk score</span>
                      <span>{result.riskScore}</span>
                    </div>
                  )}
                </div>

                {/* Field grid */}
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Coverage"
                    value={result.coverage_type || result.coverageType || "—"}
                  />
                  <Field
                    label="Named insured"
                    value={result.vendor_name || result.namedInsured || "—"}
                  />
                  <Field
                    label="Additional insured"
                    value={
                      typeof result.additionalInsured === "boolean"
                        ? result.additionalInsured ? "Yes" : "No"
                        : "—"
                    }
                  />
                  <Field
                    label="Waiver status"
                    value={result.waiverStatus || "—"}
                  />
                  <Field
                    label="Effective date"
                    value={result.effective_date || "—"}
                  />
                  <Field
                    label="Expiration"
                    value={
                      result.expiration_date ||
                      result.expiration ||
                      "—"
                    }
                  />
                  <Field
                    label="Completeness"
                    value={result.completenessRating || "—"}
                  />
                </div>

                {/* Limits */}
                {result.limits && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-xs font-semibold text-slate-700 mb-1.5">
                      Limits
                    </p>
                    <pre className="text-[11px] text-slate-700 whitespace-pre-wrap">
                      {typeof result.limits === "string"
                        ? result.limits
                        : JSON.stringify(result.limits, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Flags & Missing */}
                <div className="grid md:grid-cols-2 gap-3">
                  {result.flags?.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
                      <p className="text-xs font-semibold text-amber-800 mb-1.5">
                        Flags
                      </p>
                      <ul className="list-disc list-inside text-[11px] text-amber-900">
                        {result.flags.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.missingFields?.length > 0 && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3">
                      <p className="text-xs font-semibold text-rose-800 mb-1.5">
                        Missing required fields
                      </p>
                      <ul className="list-disc list-inside text-[11px] text-rose-900">
                        {result.missingFields.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Debug JSON */}
                {debugResponse && (
                  <pre className="text-[11px] bg-slate-100 p-2 rounded border mt-4 max-h-64 overflow-auto">
                    {debugResponse}
                  </pre>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Back link */}
        <a href="/dashboard" className="text-sm text-blue-600">
          ← Back to Dashboard
        </a>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 mb-0.5">
        {label}
      </p>
      <p className="text-sm text-slate-900 truncate">{value || "—"}</p>
    </div>
  );
}
