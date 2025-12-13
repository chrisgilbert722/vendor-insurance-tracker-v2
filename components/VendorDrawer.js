// components/VendorDrawer.js
// ============================================================
// Vendor Drawer V8 — Engine V5 • Policies • Compliance Documents • Contract Intelligence V3
// Step 2: Unified "Compliance Documents" language
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
import DocumentsUpload from "./DocumentsUpload";
import DocumentTypeBadge from "./DocumentTypeBadge";

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
  async function refreshAlerts() {
    setAlertsLoading(true);
    try {
      const res = await fetch(
        `/api/alerts/vendor-v3?vendorId=${vendor.id}&orgId=${activeOrgId}`
      );
      const json = await res.json();
      setAlerts(json.alerts || []);
    } catch (err) {
      console.error("Failed to refresh alerts:", err);
    } finally {
      setAlertsLoading(false);
    }
  }

  useEffect(() => {
    if (!vendor?.id || !activeOrgId) return;
    refreshAlerts();
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

          {/* RIGHT COLUMN — COMPLIANCE DOCUMENTS */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={18} className="text-slate-200" />
              <h3 className="text-sm font-semibold">
                Compliance Documents
              </h3>
            </div>

            <div className="text-xs text-slate-400 -mt-1">
              All vendor compliance documents are managed here — insurance,
              licenses, contracts, and more.
            </div>

            <DocumentsUpload
              orgId={activeOrgId}
              vendorId={vendor?.id}
              onDocumentUploaded={(doc) => {
                setDocuments((prev) => [doc, ...prev]);
                refreshAlerts();
              }}
            />

            {docsLoading ? (
              <div className="text-sm text-slate-500">
                Loading compliance documents…
              </div>
            ) : docsError ? (
              <div className="text-sm text-rose-400">{docsError}</div>
            ) : documents.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-xs text-slate-400">
                No compliance documents uploaded yet.
                <br />
                Upload once — we track compliance automatically.
              </div>
            ) : (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {documents
                  .filter((d) => d.document_type !== "contract")
                  .map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-2xl border border-slate-800 bg-slate-900/60"
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <DocumentTypeBadge type={doc.document_type} />
                          <div className="text-[11px] text-slate-500">
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
                        {doc.ai_json?.summary ||
                          "AI summary not available for this document."}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
