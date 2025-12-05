// components/VendorDrawer.js
// Vendor Drawer V3 — Tailwind + Rule Engine V3 + Renewal Email + Fix Plan

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  X as XIcon,
  ShieldWarning,
  ShieldCheck,
  WarningCircle,
  FileText,
  ListBullets,
  EnvelopeSimple,
  ClipboardText,
} from "@phosphor-icons/react";
import { useOrg } from "../context/OrgContext";

function computeV3Tier(score) {
  if (score >= 85) return "Elite Safe";
  if (score >= 70) return "Preferred";
  if (score >= 55) return "Watch";
  if (score >= 35) return "High Risk";
  return "Severe";
}

export default function VendorDrawer({ vendor, policies, onClose }) {
  const { activeOrgId } = useOrg();

  const [compliance, setCompliance] = useState(null);
  const [loadingCompliance, setLoadingCompliance] = useState(true);

  const [emailModal, setEmailModal] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailData, setEmailData] = useState(null);

  // 🔥 Rule Engine V3 state
  const [engine, setEngine] = useState(null);
  const [engineLoading, setEngineLoading] = useState(true);
  const [engineError, setEngineError] = useState("");

  // ===========================
  // 1) Compliance loader
  // ===========================
  useEffect(() => {
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
        console.error("Compliance error:", err);
      } finally {
        setLoadingCompliance(false);
      }
    }

    if (vendor?.id) {
      loadCompliance();
    }
  }, [vendor.id]);

  // ===========================
  // 2) Rule Engine V3 loader
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
            dryRun: true, // don't rewrite DB every time we open the drawer
          }),
        });

        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Engine error");

        setEngine(json);
      } catch (err) {
        console.error("[VendorDrawer] engine error:", err);
        setEngineError(err.message || "Rule Engine V3 failed.");
      } finally {
        setEngineLoading(false);
      }
    }

    loadEngine();
  }, [vendor?.id, activeOrgId]);

  // ===========================
  // Renewal email logic
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

  const v3Score =
    engine && typeof engine.globalScore === "number"
      ? engine.globalScore
      : null;
  const v3Tier = v3Score != null ? computeV3Tier(v3Score) : "Unknown";
  const failingRules = engine?.failingRules || [];

  return (
    <>
      {/* BACKDROP */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* DRAWER */}
      <div className="fixed right-0 top-0 h-full w-[420px] bg-slate-950 text-slate-100 border-l border-slate-800 shadow-xl z-50 p-6 overflow-y-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Vendor Overview</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            <XIcon size={22} />
          </button>
        </div>

        {/* Vendor Header */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold">{vendor.name}</h3>
          <p className="text-sm text-slate-400">
            {vendor.email ? vendor.email : "No email on file"}
          </p>
        </div>

        <hr className="my-4 border-slate-800" />

        {/* 🔥 Rule Engine V3 Summary */}
        <div className="space-y-3 mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            Rule Engine V3
          </h3>

          {engineLoading ? (
            <p className="text-xs text-slate-500">Evaluating rules…</p>
          ) : engineError ? (
            <p className="text-xs text-rose-400">{engineError}</p>
          ) : v3Score == null ? (
            <p className="text-xs text-slate-500">
              No rule evaluation available for this vendor yet.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-lime-300 to-amber-300 bg-clip-text text-transparent">
                    {v3Score}
                  </div>
                  <div className="text-[11px] text-slate-400 uppercase tracking-[0.16em]">
                    {v3Tier}
                  </div>
                </div>
                <div className="text-xs text-slate-300 text-right">
                  {engine.failedCount > 0 ? (
                    <>
                      <span className="text-rose-400 font-semibold">
                        {engine.failedCount}
                      </span>{" "}
                      failing rule
                      {engine.failedCount > 1 ? "s" : ""}
                    </>
                  ) : (
                    <span className="text-emerald-400">All rules passing</span>
                  )}
                </div>
              </div>

              {failingRules.length > 0 && (
                <div className="mt-2 rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2">
                  <div className="text-[11px] text-rose-300 uppercase tracking-[0.14em] mb-1">
                    Failing Rules
                  </div>
                  <ul className="text-xs text-rose-100 space-y-1 list-disc ml-4">
                    {failingRules.slice(0, 5).map((r, idx) => (
                      <li key={idx}>
                        <span className="font-semibold">
                          [{r.severity || "rule"}]{" "}
                        </span>
                        {r.message}
                      </li>
                    ))}
                  </ul>
                  {failingRules.length > 5 && (
                    <div className="mt-1 text-[11px] text-rose-200">
                      +{failingRules.length - 5} more…
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <hr className="my-4 border-slate-800" />

        {/* Compliance Section */}
        <div className="space-y-3 mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ShieldWarning size={16} className="text-amber-400" />
            Compliance Summary
          </h3>

          {loadingCompliance ? (
            <p className="text-xs text-slate-500">Loading compliance…</p>
          ) : compliance?.missing?.length > 0 ? (
            <div className="text-xs text-rose-400">
              Missing required coverage:
              <ul className="list-disc ml-4 mt-1 space-y-1">
                {compliance.missing.map((m, idx) => (
                  <li key={idx}>{m.coverage_type}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-emerald-400">Fully compliant.</p>
          )}
        </div>

        <hr className="my-4 border-slate-800" />

        {/* Renewal Email Button */}
        <button
          onClick={() => {
            setEmailModal(true);
            generateRenewalEmail();
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-slate-950 text-sm font-semibold rounded-lg shadow transition"
        >
          <EnvelopeSimple size={16} />
          Generate Renewal Email
        </button>

        <hr className="my-4 border-slate-800" />

        {/* Policies */}
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <ListBullets size={16} className="text-slate-300" />
            Policies
          </h3>

          <div className="space-y-3">
            {policies.map((p) => (
              <div
                key={p.id}
                className="p-3 bg-slate-900/40 border border-slate-800 rounded-lg"
              >
                <p className="text-sm font-semibold text-slate-200">
                  {p.coverage_type || "Coverage"}
                </p>
                <p className="text-xs text-slate-400">
                  {p.carrier || "Unknown carrier"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Policy #: {p.policy_number || "—"}
                </p>
                <p className="text-xs text-slate-500">
                  Expires: {p.expiration_date || "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* EMAIL MODAL */}
      {emailModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-slate-900 text-slate-100 w-full max-w-lg rounded-xl border border-slate-700 p-6 shadow-xl relative">
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
              <p className="text-sm text-rose-400">{emailError}</p>
            )}

            {emailData && (
              <>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold">Subject</h3>
                  <div className="bg-slate-800 p-3 rounded-lg text-xs border border-slate-700 mt-1">
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

                <div>
                  <h3 className="text-sm font-semibold">Body</h3>
                  <pre className="bg-slate-800 p-3 rounded-lg text-xs border border-slate-700 whitespace-pre-wrap mt-1">
                    {emailData.body}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(emailData.body)}
                    className="mt-2 flex items-center gap-2 text-xs text-slate-300 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-700"
                  >
                    <ClipboardText size={14} />
                    Copy Body
                  </button>

                  {/* Existing Fix Plan Button */}
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
    </>
  );
}
