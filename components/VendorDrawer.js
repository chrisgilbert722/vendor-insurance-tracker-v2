// components/VendorDrawer.js
// Vendor Drawer V6 — Cinematic Cockpit Panel (V5 Engine + Document Intelligence)

import { useEffect, useState } from "react";
import {
  X as XIcon,
  ShieldWarning,
  ShieldCheck,
  WarningCircle,
  ListBullets,
  EnvelopeSimple,
  ClipboardText,
} from "@phosphor-icons/react";
import { useOrg } from "../context/OrgContext";

// GLOBAL COLORS
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

function computeTier(score) {
  if (score >= 85) return "Elite Safe";
  if (score >= 70) return "Preferred";
  if (score >= 55) return "Watch";
  if (score >= 35) return "High Risk";
  return "Severe";
}

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString();
}

export default function VendorDrawer({ vendor, policies, onClose }) {
  const { activeOrgId } = useOrg();

  // ------------ STATE ------------
  const [engine, setEngine] = useState(null);
  const [engineLoading, setEngineLoading] = useState(true);
  const [engineError, setEngineError] = useState("");

  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState("");

  const [emailModal, setEmailModal] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailData, setEmailData] = useState(null);

  // ------------ LOAD ENGINE (V5) ------------
  useEffect(() => {
    if (!vendor?.id || !activeOrgId) return;

    async function loadEngine() {
      try {
        setEngineLoading(true);
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
        if (!json.ok) throw new Error(json.error);
        setEngine(json);
      } catch (err) {
        setEngineError(err.message);
      } finally {
        setEngineLoading(false);
      }
    }

    loadEngine();
  }, [vendor?.id, activeOrgId]);

  // ------------ LOAD ALERTS ------------
  useEffect(() => {
    if (!vendor?.id || !activeOrgId) return;

    async function loadAlerts() {
      try {
        setAlertsLoading(true);
        const res = await fetch(
          `/api/alerts/vendor-v3?vendorId=${vendor.id}&orgId=${activeOrgId}`
        );
        const json = await res.json();
        if (!json.ok) throw new Error(json.error);
        setAlerts(json.alerts || []);
      } catch (err) {
        console.error("[VendorDrawer] Alerts:", err);
      } finally {
        setAlertsLoading(false);
      }
    }

    loadAlerts();
  }, [vendor?.id, activeOrgId]);

  // ------------ LOAD DOCUMENTS ------------
  useEffect(() => {
    if (!vendor?.id) return;

    async function loadDocs() {
      try {
        setDocsLoading(true);
        const res = await fetch(`/api/admin/vendor/overview?id=${vendor.id}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error);
        setDocuments(json.documents || []);
      } catch (err) {
        setDocsError(err.message);
      } finally {
        setDocsLoading(false);
      }
    }

    loadDocs();
  }, [vendor?.id]);

  // ------------ EMAIL GENERATION ------------
  async function generateEmail() {
    try {
      setEmailLoading(true);
      const res = await fetch("/api/vendor/email-renewal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: vendor.id }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setEmailData(json);
    } catch (err) {
      setEmailError(err.message);
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

      {/* PANEL WRAPPER */}
      <div className="fixed inset-x-0 bottom-0 md:bottom-6 md:right-6 md:left-auto z-50 flex justify-center md:justify-end pointer-events-none">
        <div className="pointer-events-auto w-full max-w-5xl max-h-[90vh] rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-950/95 to-slate-950/98 shadow-2xl p-6 md:p-8 grid md:grid-cols-[1.25fr,1.75fr] gap-8 overflow-hidden">

          {/* =============================== */}
          {/* LEFT COLUMN                     */}
          {/* =============================== */}
          <div className="flex flex-col gap-5 border-r border-slate-800/70 pr-6">

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
                  Vendor ID: {vendor?.id}
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-full border border-slate-700 px-3 py-1 text-xs bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:border-slate-500"
              >
                <XIcon size={14} className="inline" /> Close
              </button>
            </div>

            {/* RULE ENGINE SUMMARY */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <span className="text-[11px] tracking-[0.14em] text-slate-400 uppercase font-semibold">
                    Rule Engine V5
                  </span>
                </div>

                {tier && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-700 bg-slate-900/60 text-slate-300">
                    {tier}
                  </span>
                )}
              </div>

              {/* ENGINE STATE */}
              {engineLoading ? (
                <div className="text-[11px] text-slate-500">Evaluating V5 rules…</div>
              ) : engineError ? (
                <div className="text-[11px] text-rose-400">{engineError}</div>
              ) : score == null ? (
                <div className="text-[11px] text-slate-500">
                  No rule engine data yet.
                </div>
              ) : (
                <>
                  {/* SCORE */}
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

                  {/* FAILING RULES (preview) */}
                  {failingRules.length > 0 && (
                    <div className="mt-2 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3">
                      <div className="text-[11px] text-rose-200 uppercase tracking-[0.12em] mb-1">
                        Failing Rules
                      </div>

                      <ul className="space-y-2 text-[11px] text-rose-100 pl-0 list-none">
                        {failingRules.slice(0, 4).map((r, idx) => (
                          <li key={idx} className="border-b border-rose-700/40 pb-1">
                            <div className="font-semibold text-rose-300">
                              [{r.severity?.toUpperCase()}]
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

            {/* ALERT SNAPSHOT */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <div className="flex items-center gap-2 mb-1">
                <WarningCircle size={16} className="text-rose-400" />
                <h3 className="text-sm font-semibold">Alerts</h3>
              </div>

              {alertsLoading ? (
                <div className="text-[11px] text-slate-500">Loading…</div>
              ) : alerts.length === 0 ? (
                <div className="text-[11px] text-slate-400">No alerts.</div>
              ) : (
                <ul className="pl-0 list-none text-[11px] text-slate-200 space-y-1">
                  {alerts.slice(0, 4).map((a, idx) => (
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
                  {alerts.length > 4 && (
                    <li className="text-[10px] text-slate-400">
                      +{alerts.length - 4} more…
                    </li>
                  )}
                </ul>
              )}
            </div>

            {/* RENEWAL EMAIL BUTTON */}
            <button
              onClick={() => {
                setEmailModal(true);
                generateEmail();
              }}
              className="w-full flex items-center justify-center gap-2 mt-1 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-slate-950 text-sm font-semibold rounded-lg transition"
            >
              <EnvelopeSimple size={16} />
              Generate Renewal Email
            </button>

          </div> {/* END LEFT COLUMN */}

          {/* =============================== */}
          {/* RIGHT COLUMN — POLICIES         */}
          {/* =============================== */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <ListBullets size={18} className="text-slate-200" />
              <h3 className="text-sm font-semibold">Policies</h3>
            </div>

            {policies.length === 0 ? (
              <div className="text-sm text-slate-400">No policies found.</div>
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
                          {p.coverage_type}
                        </div>
                        <div className="text-sm font-semibold text-slate-50 mt-1">
                          {p.carrier || "Unknown carrier"}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Policy #: {p.policy_number}
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
          </div> {/* END RIGHT COLUMN */}
        </div> {/* END PANEL GRID */}
      </div> {/* END PANEL WRAPPER */}
    </>
  );
}
      {/* ===================================================== */}
      {/* DOCUMENT INTELLIGENCE PANEL (MULTI-DOCUMENT V6)       */}
      {/* ===================================================== */}

      <div className="fixed bottom-[calc(90vh-120px)] right-6 left-6 md:left-auto md:right-6 z-[55] pointer-events-none flex justify-center md:justify-end">
        <div className="pointer-events-auto w-full max-w-5xl rounded-3xl border border-slate-800 bg-slate-950/95 shadow-[0_18px_60px_rgba(0,0,0,0.8)] p-5 md:p-6 mt-4">

          <div className="flex items-center gap-2 mb-3">
            <ClipboardText size={18} className="text-slate-200" />
            <h3 className="text-sm font-semibold">Document Intelligence</h3>
          </div>

          {/* LOADING */}
          {docsLoading ? (
            <div className="text-sm text-slate-500">Loading documents…</div>
          ) : docsError ? (
            <div className="text-sm text-rose-400">{docsError}</div>
          ) : documents.length === 0 ? (
            <div className="text-sm text-slate-400">No documents uploaded yet.</div>
          ) : (
            <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
              {documents.map((doc) => {
                const ai = doc.ai_json || {};
                const summary = ai.summary || "No AI summary available.";
                const n = ai.normalized || {};
                const type = doc.document_type;

                const color =
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
                          className={`text-[11px] uppercase tracking-[0.12em] ${color}`}
                        >
                          {type.toUpperCase()}
                        </div>

                        <div className="text-[11px] text-slate-500 mt-1">
                          Uploaded: {formatDate(doc.uploaded_at)}
                        </div>
                      </div>

                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] px-2 py-1 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-300"
                      >
                        View File
                      </a>
                    </div>

                    {/* AI SUMMARY */}
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
                              <span className="font-semibold">Termination:</span>{" "}
                              {n.termination_date || "—"}
                            </div>
                            <div>
                              <span className="font-semibold">Liability:</span>{" "}
                              {n.liability_clause || "—"}
                            </div>
                            <div>
                              <span className="font-semibold">Coverage Min:</span>{" "}
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
                              <span className="font-semibold">Jurisdiction:</span>{" "}
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

                        {/* SAFETY */}
                        {type === "safety" && (
                          <div className="space-y-2 text-[11px] text-slate-200">
                            <div>
                              <span className="font-semibold">Summary:</span>{" "}
                              {n.summary || "—"}
                            </div>
                            <div>
                              <span className="font-semibold">
                                Safety Flags:
                              </span>{" "}
                              {n.flags || "—"}
                            </div>
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

      {/* ===================================================== */}
      {/* RENEWAL EMAIL MODAL (only appears ONCE)               */}
      {/* ===================================================== */}
      {emailModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-[70]">
          <div className="bg-slate-950 text-slate-100 w-full max-w-xl rounded-2xl border border-slate-700 p-6 shadow-2xl relative">

            {/* CLOSE */}
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

            {/* HEADER */}
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <EnvelopeSimple size={18} />
              Renewal Request Email
            </h2>

            {/* LOADING */}
            {emailLoading && (
              <p className="text-sm text-slate-400">Generating…</p>
            )}

            {/* ERROR */}
            {emailError && (
              <p className="text-sm text-rose-400 mb-2">{emailError}</p>
            )}

            {/* CONTENT */}
            {emailData && (
              <>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold">Subject</h3>
                  <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-xs mt-1">
                    {emailData.subject}
                  </div>

                  <button
                    onClick={() => navigator.clipboard.writeText(emailData.subject)}
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
                    onClick={() => navigator.clipboard.writeText(emailData.body)}
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
