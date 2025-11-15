import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import {
  UploadCloud,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from "lucide-react";

const STEP_LABELS = [
  "Uploading file",
  "Extracting fields",
  "Validating coverage",
  "Analyzing risk",
];

export default function UploadCOI() {
  const router = useRouter();

  // === YOUR ORIGINAL STATES (kept) ===
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [debugResponse, setDebugResponse] = useState("");

  // === NEW STATES FOR PREMIUM UI ===
  const [dragActive, setDragActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState("");

  // 🚨 Supabase Auth Check (kept EXACTLY as yours)
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
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
  };

  async function processFile(file) {
    reset();
    setFile(file);
    setFileName(file.name);
    setStatus("working");
    setStepIndex(0); // Uploading…

    try {
      const form = new FormData();
      form.append("file", file);

      // Advance to "Extracting"
      setTimeout(() => setStepIndex(1), 300);

      // 🔥 USE YOUR EXISTING API ROUTE EXACTLY AS-IS
      const res = await fetch("/api/extract-coi", {
        method: "POST",
        body: form,
      });

      const type = res.headers.get("content-type") || "";
      let data;

      if (type.includes("application/json")) {
        data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else {
        const txt = await res.text();
        throw new Error("Invalid server response:\n" + txt.slice(0, 200));
      }

      // === YOUR ORIGINAL DEBUG PANEL (kept) ===
      setDebugResponse(JSON.stringify(data, null, 2));

      // Smooth transitions
      setTimeout(() => setStepIndex(2), 400);
      setTimeout(() => {
        setStepIndex(3);
        setTimeout(() => {
          setSuccess("Upload successful!");
          setStatus("done");
          setResult(data.data || data);
        }, 300);
      }, 650);

    } catch (err) {
      console.error(err);
      setError(err.message);
      setStatus("error");
      setStepIndex(-1);
    }
  }

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  const riskColor = (score) => {
    if (score >= 80) return "bg-green-100 text-green-700 border-green-200";
    if (score >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* HEADER */}
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-widest text-slate-500">
            G-Track · Vendor COI Automation
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Upload Certificate of Insurance
          </h1>
          <p className="text-slate-600 text-sm max-w-2xl">
            Drag & drop a COI PDF. AI will extract carrier, limits, expiration, flags & risk score.
          </p>
        </header>

        <div className="grid md:grid-cols-[3fr_2fr] gap-6">

          {/* LEFT PANEL (UPLOAD) */}
          <section className="bg-white rounded-2xl border p-6 space-y-6 shadow-sm">

            {/* Upload Box */}
            <div
              onDragEnter={() => setDragActive(true)}
              onDragLeave={() => setDragActive(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`py-10 px-6 rounded-xl border-2 border-dashed cursor-pointer transition
              ${
                dragActive
                  ? "border-blue-500 bg-blue-50/80"
                  : "border-slate-300 bg-slate-100/70 hover:bg-slate-200/50"
              }`}
            >
              <label htmlFor="fileInput" className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 bg-blue-600 rounded-full text-white flex items-center justify-center">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-slate-900">Drag & drop PDF</p>
                  <p className="text-sm text-slate-500">
                    or <span className="text-blue-600 font-semibold">browse files</span>
                  </p>
                  {fileName && (
                    <p className="text-xs text-slate-500 mt-1">
                      Selected: <strong>{fileName}</strong>
                    </p>
                  )}
                </div>
              </label>

              <input
                id="fileInput"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
              />
            </div>

            {/* AI STEPS */}
            <div>
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                AI Processing Pipeline
              </h2>
              <ol className="space-y-2">
                {STEP_LABELS.map((label, idx) => {
                  const active = stepIndex === idx && status === "working";
                  const done = stepIndex > idx && status === "done";
                  return (
                    <li key={idx} className="flex items-center justify-between">
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
                          {done ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                        </div>
                        <span className={active ? "text-slate-900" : "text-slate-500"}>
                          {label}
                        </span>
                      </div>
                      {active && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* ERROR */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                {error}
              </div>
            )}

            {/* SUCCESS */}
            {success && (
              <p className="text-sm text-emerald-600 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> {success}
              </p>
            )}

          </section>

          {/* RIGHT PANEL (SUMMARY) */}
          <section className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 text-white h-9 w-9 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">COI Summary</p>
                <p className="text-xs text-slate-500">AI-extracted details</p>
              </div>
            </div>

            {!result && status === "idle" && (
              <p className="text-sm text-slate-500">
                Upload a certificate to see extracted details.
              </p>
            )}

            {/* Skeleton while working */}
            {!result && status === "working" && (
              <div className="space-y-3">
                <div className="h-4 w-36 bg-slate-100 animate-pulse rounded" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-16 bg-slate-100 animate-pulse rounded-xl" />
                  <div className="h-16 bg-slate-100 animate-pulse rounded-xl" />
                  <div className="h-16 bg-slate-100 animate-pulse rounded-xl" />
                  <div className="h-16 bg-slate-100 animate-pulse rounded-xl" />
                </div>
              </div>
            )}

            {/* Final extracted data */}
            {result && (
              <div className="space-y-4 text-sm">

                {/* Top row */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs uppercase text-slate-500 tracking-wider">
                      Carrier · Policy
                    </p>
                    <p className="font-semibold text-slate-900">
                      {result.carrier || "—"} ·{" "}
                      {result.policyNumber || result.policy || "—"}
                    </p>
                  </div>

                  {typeof result.riskScore === "number" && (
                    <div
                      className={`px-3 py-1 rounded-full border text-xs font-medium ${riskColor(
                        result.riskScore
                      )}`}
                    >
                      Risk: {result.riskScore}
                    </div>
                  )}
                </div>

                {/* Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Coverage" value={result.coverageType || "—"} />
                  <Field label="Named Insured" value={result.namedInsured || "—"} />
                  <Field
                    label="Additional Insured"
                    value={
                      typeof result.additionalInsured === "boolean"
                        ? result.additionalInsured ? "Yes" : "No"
                        : "—"
                    }
                  />
                  <Field label="Waiver" value={result.waiverStatus || "—"} />
                  <Field label="Expiration" value={result.expiration || "—"} />
                  <Field
                    label="Completeness"
                    value={result.completenessRating || "—"}
                  />
                </div>

                {/* Limits */}
                {result.limits && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <p className="text-xs font-semibold text-slate-700">Limits</p>
                    <pre className="text-[11px] text-slate-700 whitespace-pre-wrap">
                      {typeof result.limits === "string"
                        ? result.limits
                        : JSON.stringify(result.limits, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Flags + Missing Fields */}
                <div className="grid grid-cols-2 gap-3">
                  {result.flags?.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-amber-800">Flags</p>
                      <ul className="text-[11px] text-amber-900 list-disc list-inside">
                        {result.flags.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.missingFields?.length > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-rose-800">
                        Missing Fields
                      </p>
                      <ul className="text-[11px] text-rose-900 list-disc list-inside">
                        {result.missingFields.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* DEBUG PANEL (yours, kept 100%) */}
                {debugResponse && (
                  <pre className="text-[11px] bg-slate-100 p-2 rounded border mt-4">
                    {debugResponse}
                  </pre>
                )}

              </div>
            )}

          </section>
        </div>

        {/* Back Link */}
        <a href="/dashboard" className="text-sm text-blue-600">
          ← Back to Dashboard
        </a>

      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
      <p className="text-[11px] uppercase text-slate-500 tracking-wider mb-1">
        {label}
      </p>
      <p className="text-sm text-slate-900">{value}</p>
    </div>
  );
}
