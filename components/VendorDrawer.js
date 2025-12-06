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
  FileText,
} from "@phosphor-icons/react";
import { useOrg } from "../context/OrgContext";

// GLOBAL PALETTE
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
  textMuted: "#6b7280",
};

function computeV3Tier(score) {
  if (score >= 85) return "Elite Safe";
  if (score >= 70) return "Preferred";
  if (score >= 55) return "Watch";
  if (score >= 35) return "High Risk";
  return "Severe";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString();
}

export default function VendorDrawer({ vendor, policies, onClose }) {
  const { activeOrgId } = useOrg();

  // Compliance / vendor detail
  const [compliance, setCompliance] = useState(null);
  const [loadingCompliance, setLoadingCompliance] = useState(true);

  // Rule Engine V5 (backend endpoint is still run-v3 but now V5 logic)
  const [engine, setEngine] = useState(null);
  const [engineLoading, setEngineLoading] = useState(true);
  const [engineError, setEngineError] = useState("");

  // Alerts
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  // Documents (Multi-Document Intelligence)
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState("");

  // Renewal email
  const [emailModal, setEmailModal] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailData, setEmailData] = useState(null);

  // ===========================
  // 1) Load vendor compliance snapshot
  // ===========================
  useEffect(() => {
    if (!vendor?.id) return;

    async function loadCompliance() {
      try {
        setLoadingCompliance(true);
        const res = await fetch(`/api/vendors/${vendor.id}`);
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error);

        const p = data.policies || [];
        const missing = [];
        const failing = [];

        p.forEach((policy) => {
          if (!policy.expiration_date) {
            missing.push({ coverage_type: policy.coverage_type });
          }
        });

        setCompliance({ missing, failing });
      } catch (err) {
        console.error("[VendorDrawer] compliance error:", err);
      } finally {
        setLoadingCompliance(false);
      }
    }

    loadCompliance();
  }, [vendor?.id]);

  // ===========================
  // 2) Load Rule Engine V5 (via run-v3 endpoint)
  // ===========================
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
        console.error("[VendorDrawer] Rule Engine error:", err);
        setEngineError(err.message || "Rule Engine V5 failed.");
      } finally {
        setEngineLoading(false);
      }
    }

    loadEngine();
  }, [vendor?.id, activeOrgId]);

  // ===========================
  // 3) Load vendor alerts
  // ===========================
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

  // ===========================
  // 4) Load vendor documents (Document Intelligence)
  // ===========================
  useEffect(() => {
    if (!vendor?.id || !activeOrgId) return;

    async function loadDocuments() {
      try {
        setDocsLoading(true);
        setDocsError("");

        // reuse admin overview, which already returns documents[]
        const res = await fetch(
          `/api/admin/vendor/overview?id=${vendor.id}`
        );
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

    loadDocuments();
  }, [vendor?.id, activeOrgId]);

  // ===========================
  // Renewal email generation
  // ===========================
  async function generateRenewalEmail() {
    setEmailLoading(true);
    setEmailError("");
    setEmailData(null);

    try {
      const res = await fetch("/api/vendor/email-renewal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: vendor.id }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error);

      setEmailData(data);
    } catch (err) {
      console.error("Email generation error:", err);
      setEmailError(err.message || "Failed to generate email.");
    } finally {
      setEmailLoading(false);
    }
  }

  function copyToClipboard(text) {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(text).catch(() => {});
  }

  // Derived engine state
  const v3Score =
    engine && typeof engine.globalScore === "number"
      ? engine.globalScore
      : null;
  const v3Tier = v3Score != null ? computeV3Tier(v3Score) : "Unknown";
  const failingRules = engine?.failingRules || [];
  return (
    <>
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* CINEMATIC PANEL */}
      <div
        className="fixed inset-x-0 bottom-0 md:bottom-6 md:inset-x-auto md:right-6 md:left-auto z-50 flex justify-center md:justify-end pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full max-w-5xl max-h-[90vh] rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-950/95 via-slate-950 to-slate-950/95 shadow-[0_24px_80px_rgba(0,0,0,0.9)] p-6 md:p-8 grid md:grid-cols-[1.3fr,1.7fr] gap-8"
        >
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-5 border-r border-slate-800/80 pr-4 md:pr-6">

            {/* HEADER */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Vendor Overview
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-50">
                  {vendor?.name || "Vendor"}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Vendor ID: {vendor?.id ?? "—"}
                </div>
              </div>

              <button
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-slate-400 hover:text-slate-100 hover:border-slate-500 px-3 py-1 text-xs"
              >
                <XIcon size={16} className="mr-1" />
                Close
              </button>
            </div>

            {/* RULE ENGINE V5 SUMMARY */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 space-y-2">

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Rule Engine V5
                  </div>
                </div>

                {v3Tier && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full border border-slate-700 text-slate-300 bg-slate-900/60"
                    title="Score reflects V5 rule evaluation"
                  >
                    {v3Tier}
                  </span>
                )}
              </div>

              {/* ENGINE STATES */}
              {engineLoading ? (
                <div className="text-[11px] text-slate-500 mt-1">
                  Evaluating V5 rules…
                </div>
              ) : engineError ? (
                <div className="text-[11px] text-rose-400 mt-1">
                  {engineError}
                </div>
              ) : v3Score == null ? (
                <div className="text-[11px] text-slate-500 mt-1">
                  No rule evaluation available for this vendor yet.
                </div>
              ) : (
                <>
                  {/* SCORE */}
                  <div className="flex items-baseline justify-between mt-2">
                    <div>
                      <div
                        className="text-3xl font-bold bg-gradient-to-r from-emerald-400 via-lime-300 to-amber-300 bg-clip-text text-transparent"
                      >
                        {v3Score}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Global compliance score (V5 Rules)
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-300">
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

                  {/* FAILING RULES */}
                  {failingRules.length > 0 && (
                    <div className="mt-3 rounded-xl border border-rose-500/50 bg-rose-950/40 px-3 py-2">
                      <div className="text-[11px] text-rose-200 uppercase tracking-[0.12em] mb-1">
                        Failing Rules
                      </div>

                      <ul className="text-[11px] text-rose-100 space-y-2 pl-0 list-none">
                        {failingRules.slice(0, 4).map((r, idx) => (
                          <li key={idx} className="border-b border-rose-700/40 pb-1">
                            <div className="font-semibold text-rose-300">
                              [{r.severity?.toUpperCase() || "RULE"}]
                            </div>
                            <div className="text-rose-100">
                              <strong>{r.fieldKey}</strong> {r.operator}{" "}
                              <strong>{r.expectedValue}</strong>
                            </div>
                            <div className="text-rose-200 text-[10px] mt-1">
                              {r.message}
                            </div>
                          </li>
                        ))}
                      </ul>

                      {failingRules.length > 4 && (
                        <div className="mt-2 text-[10px] text-rose-200">
                          +{failingRules.length - 4} more…
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* COMPLIANCE SUMMARY */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldWarning size={16} className="text-amber-400" />
                <h3 className="text-sm font-semibold">Compliance Summary</h3>
              </div>

              {loadingCompliance ? (
                <p className="text-[11px] text-slate-500">Loading compliance…</p>
              ) : compliance?.missing?.length > 0 ? (
                <div className="text-[11px] text-rose-300">
                  Missing required coverage:
                  <ul className="ml-4 mt-1 space-y-1 list-disc">
                    {compliance.missing.map((m, idx) => (
                      <li key={idx}>{m.coverage_type}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-[11px] text-emerald-400">
                  Fully compliant based on current requirements.
                </p>
              )}
            </div>

            {/* ALERT SNAPSHOT */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <WarningCircle size={16} className="text-rose-400" />
                <h3 className="text-sm font-semibold">Alerts</h3>
              </div>

              {alertsLoading ? (
                <p className="text-[11px] text-slate-500">Loading alerts…</p>
              ) : alerts.length === 0 ? (
                <p className="text-[11px] text-slate-400">
                  No active alerts for this vendor.
                </p>
              ) : (
                <ul className="text-[11px] text-slate-200 space-y-1 pl-0 list-none">
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
                      +{alerts.length - 4} more alerts…
                    </li>
                  )}
                </ul>
              )}
            </div>

            {/* RENEWAL EMAIL BUTTON */}
            <button
              onClick={() => {
                setEmailModal(true);
                generateRenewalEmail();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-slate-950 text-sm font-semibold rounded-lg shadow transition mt-1"
            >
              <EnvelopeSimple size={16} />
              Generate Renewal Email
            </button>

          </div> {/* END LEFT COLUMN */}
          {/* RIGHT COLUMN — POLICIES */}
          <div className="flex flex-col gap-4">
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
                    {/* POLICY CARD */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        {/* COVERAGE TYPE */}
                        <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                          {p.coverage_type || "Coverage"}
                        </div>

                        {/* CARRIER */}
                        <div className="text-sm font-semibold text-slate-50 mt-1">
                          {p.carrier || "Unknown carrier"}
                        </div>

                        {/* POLICY NUMBER */}
                        <div className="text-[11px] text-slate-400 mt-1">
                          Policy #: {p.policy_number || "—"}
                        </div>
                      </div>

                      {/* EXPIRATION */}
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
        </div> {/* END MAIN GRID LEFT+RIGHT */}
      </div> {/* END MAIN CONTENT WRAPPER */}
          {/* ============================================ */}
          {/* DOCUMENT INTELLIGENCE PANEL (NEW FOR V6)     */}
          {/* ============================================ */}
          <div className="flex flex-col gap-4 mt-2">

            <div className="flex items-center gap-2">
              <ClipboardText size={18} className="text-slate-200" />
              <h3 className="text-sm font-semibold">Document Intelligence</h3>
            </div>

            {/* DOCUMENT LOADING STATE */}
            {docsLoading ? (
              <div className="text-sm text-slate-500">
                Loading documents…
              </div>
            ) : docs.length === 0 ? (
              <div className="text-sm text-slate-500">
                No documents uploaded yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">

                {docs.map((doc) => {
                  const ai = doc.ai_json || {};
                  const normalized = ai.normalized || {};
                  const summary = ai.summary || "No AI summary available.";

                  const docColor =
                    doc.document_type === "contract"
                      ? "text-amber-300"
                      : doc.document_type === "license"
                      ? "text-emerald-300"
                      : doc.document_type === "w9"
                      ? "text-sky-300"
                      : doc.document_type === "endorsement"
                      ? "text-fuchsia-300"
                      : "text-slate-300";

                  return (
                    <div
                      key={doc.id}
                      className="p-3 rounded-2xl border border-slate-800 bg-slate-900/60"
                    >
                      {/* HEADER ROW */}
                      <div className="flex justify-between items-start">
                        <div>
                          <div
                            className={`text-[11px] uppercase tracking-[0.12em] ${docColor}`}
                          >
                            {doc.document_type.toUpperCase()}
                          </div>

                          <div className="text-xs text-slate-400 mt-1">
                            Uploaded: {formatDate(doc.uploaded_at)}
                          </div>
                        </div>

                        {/* VIEW DOC BUTTON */}
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] px-2 py-1 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-300"
                        >
                          View File
                        </a>
                      </div>

                      {/* AI SUMMARY PANEL */}
                      <div className="mt-2 text-[11px] text-slate-300 leading-snug">
                        {summary}
                      </div>

                      {/* NORMALIZED INSIGHTS */}
                      {normalized && Object.keys(normalized).length > 0 && (
                        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/50 p-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400 mb-2">
                            AI Insights
                          </div>

                          {/* CONTRACT INSIGHTS */}
                          {doc.document_type === "contract" && (
                            <div className="space-y-2 text-[11px] text-slate-200">
                              <div>
                                <span className="font-semibold">Parties:</span>{" "}
                                {normalized.parties || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">Effective:</span>{" "}
                                {normalized.effective_date || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">Termination:</span>{" "}
                                {normalized.termination_date || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">Liability:</span>{" "}
                                {normalized.liability_clause || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">Coverage Min:</span>{" "}
                                {normalized.coverage_minimums || "—"}
                              </div>
                            </div>
                          )}

                          {/* LICENSE INSIGHTS */}
                          {doc.document_type === "license" && (
                            <div className="space-y-2 text-[11px] text-slate-200">
                              <div>
                                <span className="font-semibold">Business:</span>{" "}
                                {normalized.business_name || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">Number:</span>{" "}
                                {normalized.license_number || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">Expires:</span>{" "}
                                {normalized.expiration_date || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">Jurisdiction:</span>{" "}
                                {normalized.jurisdiction || "—"}
                              </div>
                            </div>
                          )}

                          {/* W9 INSIGHTS */}
                          {doc.document_type === "w9" && (
                            <div className="space-y-2 text-[11px] text-slate-200">
                              <div>
                                <span className="font-semibold">Name:</span>{" "}
                                {normalized.name || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">Business:</span>{" "}
                                {normalized.business_name || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">TIN:</span>{" "}
                                {normalized.tin || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">Classification:</span>{" "}
                                {normalized.entity_type || "—"}
                              </div>
                            </div>
                          )}

                          {/* ENDORSEMENT INSIGHTS */}
                          {doc.document_type === "endorsement" && (
                            <div className="space-y-2 text-[11px] text-slate-200">
                              <div>
                                <span className="font-semibold">
                                  Endorsement Type:
                                </span>{" "}
                                {normalized.endorsement_type || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">
                                  Policy Number:
                                </span>{" "}
                                {normalized.policy_number || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">Notes:</span>{" "}
                                {normalized.notes || "—"}
                              </div>
                            </div>
                          )}

                          {/* SAFETY DOC INSIGHTS */}
                          {doc.document_type === "safety" && (
                            <div className="space-y-2 text-[11px] text-slate-200">
                              <div>
                                <span className="font-semibold">Summary:</span>{" "}
                                {normalized.summary || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">
                                  Safety Flags:
                                </span>{" "}
                                {normalized.flags || "—"}
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
      {/* ===================================================== */}
      {/* EMAIL MODAL — RENEWAL REQUEST (V6)                    */}
      {/* ===================================================== */}
      {emailModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-[60]">

          <div className="bg-slate-950 text-slate-100 w-full max-w-xl rounded-2xl border border-slate-700 p-6 shadow-2xl relative animate-[fadeIn_0.2s_ease-out]">

            {/* CLOSE BUTTON */}
            <button
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-200 transition"
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

            {/* EMAIL CONTENT */}
            {emailData && (
              <>
                {/* SUBJECT */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold">Subject</h3>
                  <div className="bg-slate-900 p-3 rounded-lg text-xs border border-slate-700 mt-1">
                    {emailData.subject}
                  </div>

                  {/* COPY SUBJECT */}
                  <button
                    onClick={() => copyToClipboard(emailData.subject)}
                    className="mt-2 flex items-center gap-2 text-xs text-slate-300 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-700 transition"
                  >
                    <ClipboardText size={14} />
                    Copy Subject
                  </button>
                </div>

                {/* BODY */}
                <div>
                  <h3 className="text-sm font-semibold">Body</h3>

                  <pre className="bg-slate-900 p-3 rounded-lg text-xs border border-slate-700 whitespace-pre-wrap mt-1 max-h-60 overflow-y-auto">
                    {emailData.body}
                  </pre>

                  {/* COPY BODY */}
                  <button
                    onClick={() => copyToClipboard(emailData.body)}
                    className="mt-2 flex items-center gap-2 text-xs text-slate-300 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-700 transition"
                  >
                    <ClipboardText size={14} />
                    Copy Body
                  </button>

                  {/* FIX PLAN BUTTON */}
                  <button
                    onClick={() => {
                      window.location.href = `/vendor/${vendor.id}?fixPlan=1`;
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow transition mt-3"
                  >
                    🛠️ Generate Fix Plan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
          {/* ===================================================== */}
          {/* RIGHT COLUMN — POLICIES PANEL (continued)             */}
          {/* ===================================================== */}

          {/* Already rendered above — this section contains final wrappers */}
        </div> 
        {/* END GRID (LEFT + RIGHT COLUMNS) */}
      </div>
      {/* END CINEMATIC PANEL WRAPPER */}
    </div>
      {/* =============================== */}
      {/* EMAIL MODAL (RENEWAL EMAIL)     */}
      {/* =============================== */}
      {emailModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-[60]">
          <div className="bg-slate-950 text-slate-100 w-full max-w-xl rounded-2xl border border-slate-700 p-6 shadow-2xl relative">

            {/* CLOSE BUTTON */}
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

            {/* TITLE */}
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

            {/* EMAIL CONTENT */}
            {emailData && (
              <>
                {/* SUBJECT */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold">Subject</h3>
                  <div className="bg-slate-900 p-3 rounded-lg text-xs border border-slate-700 mt-1">
                    {emailData.subject}
                  </div>

                  <button
                    onClick={() => copyToClipboard(emailData.subject)}
                    className="mt-2 flex items-center gap-2 text-xs text-slate-300 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-700"
                  >
                    <ClipboardText size={14} />
                    Copy Subject
                  </button>
                </div>

                {/* BODY */}
                <div>
                  <h3 className="text-sm font-semibold">Body</h3>
                  <pre className="bg-slate-900 p-3 rounded-lg text-xs border border-slate-700 whitespace-pre-wrap mt-1">
                    {emailData.body}
                  </pre>

                  <button
                    onClick={() => copyToClipboard(emailData.body)}
                    className="mt-2 flex items-center gap-2 text-xs text-slate-300 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-700"
                  >
                    <ClipboardText size={14} />
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
