// components/VendorDrawer.js
// ============================================================
// Vendor Drawer V8 — Engine V5 • Policies • Docs • Contract Intelligence V3 (Severity Edition)
// ============================================================

import { useEffect, useState } from "react";
import {
  X as XIcon,
  ShieldCheck,
  WarningCircle,
  ListBullets,
  EnvelopeSimple,
  FileText,
  Scales,
} from "@phosphor-icons/react";
import { useOrg } from "../context/OrgContext";

function computeTier(score) {
  if (score >= 85) return "Elite Safe";
  if (score >= 70) return "Preferred";
  if (score >= 55) return "Watch";
  if (score >= 35) return "High Risk";
  return "Severe";
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString();
}

export default function VendorDrawer({ vendor, policies = [], onClose }) {
  const { activeOrgId } = useOrg();

  // Engine state
  const [engine, setEngine] = useState(null);
  const [engineLoading, setEngineLoading] = useState(true);
  const [engineError, setEngineError] = useState("");

  // Alerts
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  // Documents + Contract Intel
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState("");

  const [contractJson, setContractJson] = useState(null);
  const [contractScore, setContractScore] = useState(null);
  const [contractRequirements, setContractRequirements] = useState([]);
  const [contractMismatches, setContractMismatches] = useState([]);

  // Renewal email modal
  const [emailModal, setEmailModal] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailData, setEmailData] = useState(null);

  // ============================================================
  // LOAD ENGINE (dryRun)
  // ============================================================
  useEffect(() => {
    if (!vendor?.id || !activeOrgId) return;

    async function loadEngine() {
      try {
        setEngineLoading(true);
        setEngineError("");

        const res = await fetch("/api/engine/run-v3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendorId: vendor.id,
            orgId: activeOrgId,
            dryRun: true,
          }),
        });

        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Engine error");

        setEngine(json);
      } catch (err) {
        setEngineError(err.message || "Failed to run rule engine.");
      } finally {
        setEngineLoading(false);
      }
    }

    loadEngine();
  }, [vendor?.id, activeOrgId]);

  // ============================================================
  // LOAD ALERTS
  // ============================================================
  useEffect(() => {
    if (!vendor?.id || !activeOrgId) return;

    async function loadAlerts() {
      try {
        setAlertsLoading(true);

        const res = await fetch(
          `/api/alerts/vendor-v3?vendorId=${vendor.id}&orgId=${activeOrgId}`
        );
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Alert load error");

        setAlerts(json.alerts || []);
      } catch (err) {
        console.error("[VendorDrawer] alerts load error:", err);
      } finally {
        setAlertsLoading(false);
      }
    }

    loadAlerts();
  }, [vendor?.id, activeOrgId]);

  // ============================================================
  // LOAD DOCUMENTS + CONTRACT INTELLIGENCE
  // ============================================================
  useEffect(() => {
    if (!vendor?.id) return;

    async function loadDocs() {
      try {
        setDocsLoading(true);
        setDocsError("");

        const res = await fetch(`/api/admin/vendor/overview?id=${vendor.id}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Failed to load documents.");

        setDocuments(json.documents || []);
        setContractJson(json.vendor.contract_json || null);
        setContractScore(json.vendor.contract_score || null);
        setContractRequirements(json.vendor.contract_requirements || []);
        setContractMismatches(json.vendor.contract_mismatches || []);
      } catch (err) {
        console.error("[VendorDrawer] docs load error:", err);
        setDocsError(err.message || "Failed to load documents.");
      } finally {
        setDocsLoading(false);
      }
    }

    loadDocs();
  }, [vendor?.id]);

  // ============================================================
  // RENEWAL EMAIL (AI)
  // ============================================================
  async function generateRenewalEmail() {
    try {
      setEmailLoading(true);
      setEmailError("");
      setEmailData(null);

      const res = await fetch("/api/vendor/email-renewal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: vendor.id }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to generate email.");

      setEmailData(json);
    } catch (err) {
      setEmailError(err.message || "Failed to generate email.");
    } finally {
      setEmailLoading(false);
    }
  }

  const score = engine?.globalScore ?? null;
  const tier = score != null ? computeTier(score) : "Unknown";

  return (
    <>
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* MAIN PANEL */}
      <div className="fixed inset-x-0 bottom-0 md:bottom-6 md:right-6 md:left-auto z-50 flex justify-center md:justify-end pointer-events-none">
        <div className="pointer-events-auto w-full max-w-6xl max-h-[90vh] rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-950/95 via-slate-950 to-slate-950/98 shadow-[0_24px_80px_rgba(0,0,0,0.95)] p-6 md:p-8 grid md:grid-cols-[1.2fr,1.4fr,1.4fr] gap-6 overflow-hidden">

          {/* ================= LEFT COLUMN ================= */}
          <div className="flex flex-col gap-5 pr-4 border-r border-slate-800/70">
            {/* HEADER */}
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  Vendor Overview
                </div>
                <div className="text-lg font-semibold text-slate-50 mt-1">
                  {vendor?.name || "Vendor"}
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-full border border-slate-700 px-3 py-1 text-xs bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:border-slate-500"
              >
                <XIcon size={14} className="inline" /> Close
              </button>
            </div>

            {/* RULE ENGINE CARD */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-semibold">
                    Rule Engine V5
                  </span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-700 bg-slate-900/60 text-slate-300">
                  {tier}
                </span>
              </div>

              {engineLoading ? (
                <div className="text-[11px] text-slate-500">Evaluating…</div>
              ) : engineError ? (
                <div className="text-[11px] text-rose-400">{engineError}</div>
              ) : (
                <div className="flex justify-between items-baseline">
                  <div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 via-lime-300 to-amber-300 bg-clip-text text-transparent">
                      {score}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Global score
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ALERTS CARD */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <div className="flex items-center gap-2 mb-1">
                <WarningCircle size={16} className="text-rose-400" />
                <h3 className="text-sm font-semibold">Alerts</h3>
              </div>

              {alertsLoading ? (
                <div className="text-[11px] text-slate-500">Loading…</div>
              ) : alerts.length === 0 ? (
                <div className="text-[11px] text-slate-400">No alerts</div>
              ) : (
                <ul className="pl-0 list-none text-[11px] text-slate-200 space-y-1">
                  {alerts.slice(0, 5).map((a, idx) => (
                    <li key={idx}>
                      <span
                        className={
                          a.severity === "critical"
                            ? "text-rose-400"
                            : a.severity === "high"
                            ? "text-amber-300"
                            : "text-sky-300"
                        }
                      >
                        [{a.severity}] {a.code}
                      </span>{" "}
                      — {a.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* CONTRACT SCORE QUICK BLOCK */}
            {contractScore != null && (
              <div className="rounded-2xl border border-amber-300/60 bg-amber-950/30 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Scales size={16} className="text-amber-300" />
                  <span className="text-[11px] uppercase tracking-[0.16em] text-amber-200">
                    Contract Intelligence
                  </span>
                </div>

                <div className="text-3xl font-bold bg-gradient-to-r from-amber-200 to-orange-400 bg-clip-text text-transparent">
                  {contractScore}
                </div>

                <button
                  onClick={() =>
                    (window.location.href = `/admin/contracts/review?vendorId=${vendor.id}`)
                  }
                  className="mt-2 px-3 py-1 text-xs rounded-lg bg-amber-300 text-slate-900 font-semibold hover:bg-amber-200"
                >
                  Review Contract →
                </button>
              </div>
            )}

            {/* RENEWAL EMAIL BUTTON */}
            <button
              onClick={() => {
                setEmailModal(true);
                generateRenewalEmail();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-slate-950 text-sm font-semibold rounded-lg transition"
            >
              <EnvelopeSimple size={16} />
              Generate Renewal Email
            </button>
          </div>

          {/* ================= MIDDLE COLUMN — POLICIES ================= */}
          <div className="flex flex-col gap-4 border-r border-slate-800/70 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <ListBullets size={18} className="text-slate-200" />
              <h3 className="text-sm font-semibold">Policies</h3>
            </div>

            {policies.length === 0 ? (
              <div className="text-sm text-slate-400">
                No policies found for this vendor.
              </div>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {policies.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl border border-slate-800 bg-slate-900/60"
                  >
                    <div className="flex justify-between">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                          {p.coverage_type || "Coverage"}
                        </div>
                        <div className="text-sm font-semibold text-slate-50 mt-1">
                          {p.carrier || "Unknown carrier"}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Policy #: {p.policy_number || "—"}
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-slate-400">
                        <div>Expires:</div>
                        <div className="text-slate-100">
                          {formatDate(p.expiration_date)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-3 text-[11px] text-slate-300">
                      {p.limit_each_occurrence != null && (
                        <div>
                          <span className="text-slate-400">
                            Each Occurrence:{" "}
                          </span>
                          <span className="text-slate-200">
                            {p.limit_each_occurrence}
                          </span>
                        </div>
                      )}

                      {p.auto_limit != null && (
                        <div>
                          <span className="text-slate-400">Auto Limit: </span>
                          <span className="text-slate-200">{p.auto_limit}</span>
                        </div>
                      )}

                      {p.work_comp_limit != null && (
                        <div>
                          <span className="text-slate-400">Work Comp: </span>
                          <span className="text-slate-200">
                            {p.work_comp_limit}
                          </span>
                        </div>
                      )}

                      {p.umbrella_limit != null && (
                        <div>
                          <span className="text-slate-400">Umbrella: </span>
                          <span className="text-slate-200">
                            {p.umbrella_limit}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* ================= RIGHT COLUMN — DOCS + CONTRACT ================= */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={18} className="text-slate-200" />
              <h3 className="text-sm font-semibold">Documents</h3>
            </div>

            {docsLoading ? (
              <div className="text-sm text-slate-500">Loading documents…</div>
            ) : docsError ? (
              <div className="text-sm text-rose-400">{docsError}</div>
            ) : (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

                {/* CONTRACT INTELLIGENCE PANEL */}
                {contractJson && (
                  <div className="p-4 rounded-2xl border border-amber-300/40 bg-amber-950/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Scales size={18} className="text-amber-300" />
                      <h3 className="text-sm font-semibold text-amber-200">
                        Contract Intelligence
                      </h3>
                    </div>

                    {/* SUMMARY */}
                    {contractJson.summary && (
                      <div className="text-xs text-amber-100 whitespace-pre-wrap mb-3 leading-snug">
                        {contractJson.summary}
                      </div>
                    )}

                    {/* REQUIRED COVERAGES */}
                    {contractRequirements.length > 0 && (
                      <>
                        <div className="text-xs uppercase tracking-wider text-slate-300 mb-1">
                          Required Coverages
                        </div>
                        {contractRequirements.map((r, idx) => (
                          <div
                            key={idx}
                            className="text-xs text-slate-200 mb-1"
                          >
                            <strong className="text-amber-300">
                              {r.label}:
                            </strong>{" "}
                            {r.value}
                          </div>
                        ))}
                      </>
                    )}

                    {/* MISMATCHES W/ SEVERITY + FIX */}
                    {contractMismatches.length > 0 && (
                      <>
                        <div className="text-xs uppercase tracking-wider text-red-300 mt-3 mb-1">
                          Mismatches (AI Detected)
                        </div>
                        {contractMismatches.map((m, idx) => {
                          const sev = (m.severity || "high").toLowerCase();
                          const sevColor =
                            sev === "critical"
                              ? "text-rose-200"
                              : sev === "high"
                              ? "text-amber-200"
                              : sev === "medium"
                              ? "text-sky-200"
                              : "text-slate-200";

                          return (
                            <div
                              key={idx}
                              className="p-2 rounded-xl mb-2 bg-red-900/40 border border-red-700/40 text-xs text-red-100"
                            >
                              <div className={`font-semibold mb-1 ${sevColor}`}>
                                {m.severity
                                  ? `[${m.severity.toUpperCase()}] `
                                  : ""}
                                {m.label}
                              </div>
                              <div className="leading-snug mb-1">
                                {m.message}
                              </div>
                              {m.recommended_fix && (
                                <div className="text-amber-300 text-[11px] mt-1">
                                  <strong>Fix:</strong> {m.recommended_fix}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}

                    <button
                      onClick={() =>
                        (window.location.href = `/admin/contracts/review?vendorId=${vendor.id}`)
                      }
                      className="mt-3 px-3 py-1 text-xs rounded-lg bg-amber-300 text-slate-900 font-semibold hover:bg-amber-200"
                    >
                      Review Full Contract →
                    </button>
                  </div>
                )}

                {/* OTHER DOCUMENTS */}
                {documents
                  .filter((d) => d.document_type !== "contract")
                  .map((doc) => {
                    const ai = doc.ai_json || {};
                    const summary =
                      ai.summary ||
                      "AI summary not available for this document.";

                    return (
                      <div
                        key={doc.id}
                        className="p-3 rounded-2xl border border-slate-800 bg-slate-900/60"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                              {doc.document_type.toUpperCase()}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">
                              Uploaded: {formatDate(doc.uploaded_at)}
                            </div>
                          </div>
                          {doc.file_url && (
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] px-2 py-1 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-300"
                            >
                              View File
                            </a>
                          )}
                        </div>

                        <div className="mt-2 text-[11px] text-slate-300 leading-snug whitespace-pre-wrap">
                          {summary}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RENEWAL EMAIL MODAL */}
      {emailModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-[60]">
          <div className="bg-slate-950 text-slate-100 w-full max-w-xl rounded-2xl border border-slate-700 p-6 shadow-2xl relative">
            <button
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
              onClick={() => {
                setEmailModal(false);
                setEmailData(null);
                setEmailError("");
              }}
            >
              <XIcon size={20} />
            </button>

            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <EnvelopeSimple size={18} />
              Renewal Request Email
            </h2>

            {emailLoading && (
              <p className="text-sm text-slate-400">Generating…</p>
            )}

            {emailError && (
              <p className="text-sm text-rose-400 mb-2">{emailError}</p>
            )}

            {emailData && (
              <>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold">Subject</h3>
                  <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-xs mt-1">
                    {emailData.subject}
                  </div>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(emailData.subject)
                    }
                    className="mt-2 px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs hover:bg-slate-700"
                  >
                    Copy Subject
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-semibold">Body</h3>
                  <pre className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-xs whitespace-pre-wrap mt-1 max-h-60 overflow-y-auto">
                    {emailData.body}
                  </pre>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(emailData.body)
                    }
                    className="mt-2 px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs hover:bg-slate-700"
                  >
                    Copy Body
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
