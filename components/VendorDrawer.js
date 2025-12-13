// components/VendorDrawer.js
// ============================================================
// Vendor Drawer V8 — Engine V5 • Policies • Compliance Documents • Contract Intelligence V3
// Step 3: Multi-Document Grouping
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

// ============================================================
// DOCUMENT GROUPING
// ============================================================

const GROUPS = [
  {
    title: "Insurance Documents",
    description: "Certificates of Insurance and policy endorsements.",
    types: ["coi", "endorsement"],
  },
  {
    title: "Legal & Financial",
    description: "Contracts, W-9s, and financial compliance documents.",
    types: ["contract", "w9"],
  },
  {
    title: "Operational Documents",
    description: "Licenses, safety documentation, and operational proof.",
    types: ["license", "safety"],
  },
];

export default function VendorDrawer({ vendor, policies = [], onClose }) {
  const { activeOrgId } = useOrg();

  const [engine, setEngine] = useState(null);
  const [engineLoading, setEngineLoading] = useState(true);
  const [engineError, setEngineError] = useState("");

  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState("");

  // ============================================================
  // LOAD DOCUMENTS
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
      } catch (err) {
        setDocsError(err.message || "Failed to load documents.");
      } finally {
        setDocsLoading(false);
      }
    }

    loadDocs();
  }, [vendor?.id]);

  return (
    <>
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* MAIN PANEL */}
      <div className="fixed inset-x-0 bottom-0 md:bottom-6 md:right-6 md:left-auto z-50 flex justify-center md:justify-end pointer-events-none">
        <div className="pointer-events-auto w-full max-w-6xl max-h-[90vh] rounded-3xl border border-slate-800 bg-slate-950 p-6 md:p-8 overflow-hidden">

          {/* COMPLIANCE DOCUMENTS */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-slate-200" />
              <h3 className="text-sm font-semibold">
                Compliance Documents
              </h3>
            </div>

            <div className="text-xs text-slate-400">
              All vendor compliance documents are managed here — insurance,
              licenses, contracts, and more.
            </div>

            <DocumentsUpload
              orgId={activeOrgId}
              vendorId={vendor?.id}
              onDocumentUploaded={(doc) =>
                setDocuments((prev) => [doc, ...prev])
              }
            />

            {docsLoading ? (
              <div className="text-sm text-slate-500">
                Loading compliance documents…
              </div>
            ) : docsError ? (
              <div className="text-sm text-rose-400">{docsError}</div>
            ) : (
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
                {GROUPS.map((group) => {
                  const groupDocs = documents.filter((d) =>
                    group.types.includes(
                      String(d.document_type || "").toLowerCase()
                    )
                  );

                  return (
                    <div key={group.title}>
                      <div className="mb-2">
                        <div className="text-xs font-semibold text-slate-200">
                          {group.title}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {group.description}
                        </div>
                      </div>

                      {groupDocs.length === 0 ? (
                        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-xs text-slate-400">
                          No documents uploaded in this category yet.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {groupDocs.map((doc) => (
                            <div
                              key={doc.id}
                              className="p-3 rounded-2xl border border-slate-800 bg-slate-900/60"
                            >
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <DocumentTypeBadge
                                    type={doc.document_type}
                                  />
                                  <div className="text-[11px] text-slate-500">
                                    Uploaded:{" "}
                                    {formatDate(doc.uploaded_at)}
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
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
