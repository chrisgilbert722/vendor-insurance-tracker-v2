// components/VendorDrawer.js
// Vendor Drawer V6 — Cinematic 3-Column Console (Engine • Policies • Documents)

import { useEffect, useState } from "react";
import {
  X as XIcon,
  ShieldWarning,
  ShieldCheck,
  WarningCircle,
  ListBullets,
  EnvelopeSimple,
  ClipboardText,
  FileText,
} from "@phosphor-icons/react";
import { useOrg } from "../context/OrgContext";

// Basic helpers
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

  // Documents
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState("");

  // Renewal email
  const [emailModal, setEmailModal] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailData, setEmailData] = useState(null);

  // ---------------- ENGINE LOAD (V5 via run-v3) ----------------
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

  // ---------------- ALERTS LOAD ----------------
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

  // ---------------- DOCUMENTS LOAD ----------------
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
      } catch (err) {
        console.error("[VendorDrawer] documents load error:", err);
        setDocsError(err.message || "Failed to load documents.");
      } finally {
        setDocsLoading(false);
      }
    }

    loadDocs();
  }, [vendor?.id]);

  // ---------------- RENEWAL EMAIL GENERATION ----------------
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
  const failingRules = engine?.failingRules || [];

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

          {/* ================= LEFT COLUMN: Engine + Alerts ================= */}
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
                <div className="text-[11px] text-slate-500 mt-1">
                  Vendor ID: {vendor?.id ?? "—"}
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
                <div className="text-[11px] text-slate-500">
                  Evaluating V5 rules…
                </div>
              ) : engineError ? (
                <div className="text-[11px] text-rose-400">{engineError}</div>
              ) : score == null ? (
                <div className="text-[11px] text-slate-500">
                  No rule engine data yet.
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-baseline">
                    <div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 via-lime-300 to-amber-300 bg-clip-text text-transparent">
                        {score}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Global compliance score
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      {engine.failedCount > 0 ? (
                        <>
                          <span className="text-rose-400 font-semibold">
                            {engine.failedCount}
                          </span>{" "}
                          failing rule{engine.failedCount > 1 ? "s" : ""}
                        </>
                      ) : (
                        <span className="text-emerald-400">All rules passing</span>
                      )}
                    </div>
                  </div>

                  {failingRules.length > 0 && (
                    <div className="mt-2 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3">
                      <div className="text-[11px] text-rose-200 uppercase tracking-[0.12em] mb-1">
                        Failing Rules
                      </div>
                      <ul className="space-y-2 text-[11px] text-rose-100 pl-0 list-none">
                        {failingRules.slice(0, 4).map((r, idx) => (
                          <li
                            key={idx}
                            className="border-b border-rose-700/40 pb-1"
                          >
                            <div className="font-semibold text-rose-300">
                              [{r.severity?.toUpperCase() || "RULE"}]
                            </div>
                            <div>
                              <strong>{r.fieldKey}</strong> {r.operator}{" "}
                              <strong>{r.expectedValue}</strong>
                            </div>
                            <div className="text-[10px] text-rose-200 mt-1">
                              {r.message}
                            </div>
                          </li>
                        ))}
                      </ul>
                      {failingRules.length > 4 && (
                        <div className="text-[10px] text-rose-200 mt-1">
                          +{failingRules.length - 4} more…
                        </div>
                      )}
                    </div>
                  )}
                </>
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
                <div className="text-[11px] text-slate-400">No active alerts.</div>
              ) : (
                <ul className="pl-0 list-none text-[11px] text-slate-200 space-y-1">
                  {alerts.slice(0, 5).map((a, idx) => (
                    <li key={idx}>
                      <span
                        className={
                          a.severity === "critical"
                            ? "text-rose-400 font-semibold"
                            : a.severity === "high"
                            ? "text-amber-300 font-semibold"
                            : "text-sky-300 font-semibold"
                        }
                      >
                        [{a.severity}] {a.code}
                      </span>{" "}
                      — {a.message}
                    </li>
                  ))}
                  {alerts.length > 5 && (
                    <li className="text-[10px] text-slate-400">
                      +{alerts.length - 5} more…
                    </li>
                  )}
                </ul>
              )}
            </div>

            {/* RENEWAL BUTTON */}
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

          {/* ================= MIDDLE COLUMN: Policies ================= */}
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
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ================= RIGHT COLUMN: Document Intelligence ================= */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={18} className="text-slate-200" />
              <h3 className="text-sm font-semibold">Documents</h3>
            </div>

            {docsLoading ? (
              <div className="text-sm text-slate-500">Loading documents…</div>
            ) : docsError ? (
              <div className="text-sm text-rose-400">{docsError}</div>
            ) : documents.length === 0 ? (
              <div className="text-sm text-slate-400">
                No documents uploaded for this vendor yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {documents.map((doc) => {
                  const ai = doc.ai_json || {};
                  const summary =
                    ai.summary || "AI summary not available for this document.";
                  const n = ai.normalized || {};
                  const type = doc.document_type || "other";

                  const typeColor =
                    type === "contract"
                      ? "text-amber-300"
                      : type === "license"
                      ? "text-emerald-300"
                      : type === "w9"
                      ? "text-sky-300"
                      : type === "endorsement"
                      ? "text-fuchsia-300"
                      : "text-slate-300";

                  return (
                    <div
                      key={doc.id}
                      className="p-3 rounded-2xl border border-slate-800 bg-slate-900/60"
                    >
                      {/* HEADER */}
                      <div className="flex justify-between items-start">
                        <div>
                          <div
                            className={`text-[11px] uppercase tracking-[0.12em] ${typeColor}`}
                          >
                            {type.toUpperCase()}
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

                      {/* SUMMARY */}
                      <div className="mt-2 text-[11px] text-slate-300 leading-snug">
                        {summary}
                      </div>

                      {/* NORMALIZED DATA */}
                      {n && Object.keys(n).length > 0 && (
                        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/50 p-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400 mb-2">
                            AI Insights
                          </div>

                          {/* CONTRACT */}
                          {type === "contract" && (
                            <div className="space-y-2 text-[11px] text-slate-200">
                              <div>
                                <span className="font-semibold">Parties:</span>{" "}
                                {n.parties || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">Effective:</span>{" "}
                                {n.effective_date || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">
                                  Termination:
                                </span>{" "}
                                {n.termination_date || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">
                                  Liability:
                                </span>{" "}
                                {n.liability_clause || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">
                                  Coverage Min:
                                </span>{" "}
                                {n.coverage_minimums || "—"}
                              </div>
                            </div>
                          )}

                          {/* LICENSE */}
                          {type === "license" && (
                            <div className="space-y-2 text-[11px] text-slate-200">
                              <div>
                                <span className="font-semibold">Business:</span>{" "}
                                {n.business_name || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">Number:</span>{" "}
                                {n.license_number || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">Expires:</span>{" "}
                                {n.expiration_date || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">
                                  Jurisdiction:
                                </span>{" "}
                                {n.jurisdiction || "—"}
                              </div>
                            </div>
                          )}

                          {/* W9 */}
                          {type === "w9" && (
                            <div className="space-y-2 text-[11px] text-slate-200">
                              <div>
                                <span className="font-semibold">Name:</span>{" "}
                                {n.name || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">Business:</span>{" "}
                                {n.business_name || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">TIN:</span>{" "}
                                {n.tin || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">
                                  Classification:
                                </span>{" "}
                                {n.entity_type || "—"}
                              </div>
                            </div>
                          )}

                          {/* ENDORSEMENT */}
                          {type === "endorsement" && (
                            <div className="space-y-2 text-[11px] text-slate-200">
                              <div>
                                <span className="font-semibold">
                                  Endorsement Type:
                                </span>{" "}
                                {n.endorsement_type || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">
                                  Policy Number:
                                </span>{" "}
                                {n.policy_number || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">Notes:</span>{" "}
                                {n.notes || "—"}
                              </div>
                            </div>
                          )}

                          {/* SAFETY OR OTHER */}
                          {type !== "contract" &&
                            type !== "license" &&
                            type !== "w9" &&
                            type !== "endorsement" && (
                              <div className="space-y-1 text-[11px] text-slate-200">
                                {Object.entries(n).map(([key, value]) => (
                                  <div key={key}>
                                    <span className="font-semibold">
                                      {key}:
                                    </span>{" "}
                                    {typeof value === "object"
                                      ? JSON.stringify(value)
                                      : String(value)}
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= RENEWAL EMAIL MODAL (SINGLE) ================= */}
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
