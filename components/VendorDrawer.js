// components/VendorDrawer.js
// ============================================================
// Vendor Drawer V8 — Engine V5 • Policies • Compliance Documents • Contract Intelligence V3
// Step 4: Vendor Compliance Snapshot
// ============================================================

import { useEffect, useState, useMemo } from "react";
import {
  X as XIcon,
  ShieldCheck,
  WarningCircle,
  ListBullets,
  EnvelopeSimple,
  FileText,
  Scales,
  CheckCircle,
  MinusCircle,
  XCircle,
} from "@phosphor-icons/react";
import { useOrg } from "../context/OrgContext";
import DocumentsUpload from "./DocumentsUpload";
import DocumentTypeBadge from "./DocumentTypeBadge";

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
    key: "insurance",
    title: "Insurance",
    types: ["coi", "endorsement"],
  },
  {
    key: "legal",
    title: "Legal & Financial",
    types: ["contract", "w9"],
  },
  {
    key: "operational",
    title: "Operational",
    types: ["license", "safety"],
  },
];

function getCoverageStatus(docs, types) {
  const found = docs.filter((d) =>
    types.includes(String(d.document_type || "").toLowerCase())
  );

  if (found.length === 0) return "missing";
  if (found.length < types.length) return "partial";
  return "covered";
}

function StatusPill({ status }) {
  if (status === "covered") {
    return (
      <span className="flex items-center gap-1 text-emerald-300 text-xs">
        <CheckCircle size={14} /> Covered
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="flex items-center gap-1 text-amber-300 text-xs">
        <MinusCircle size={14} /> Partial
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-rose-400 text-xs">
      <XCircle size={14} /> Missing
    </span>
  );
}

export default function VendorDrawer({ vendor, policies = [], onClose }) {
  const { activeOrgId } = useOrg();

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

  const coverage = useMemo(() => {
    const map = {};
    GROUPS.forEach((g) => {
      map[g.key] = getCoverageStatus(documents, g.types);
    });
    return map;
  }, [documents]);

  return (
    <>
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* MAIN PANEL */}
      <div className="fixed inset-x-0 bottom-0 md:bottom-6 md:right-6 md:left-auto z-50 flex justify-center md:justify-end pointer-events-none">
        <div className="pointer-events-auto w-full max-w-6xl max-h-[90vh] rounded-3xl border border-slate-800 bg-slate-950 p-6 md:p-8 overflow-hidden space-y-6">

          {/* COMPLIANCE SNAPSHOT */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={18} className="text-sky-300" />
              <h3 className="text-sm font-semibold text-slate-100">
                Compliance Snapshot
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {GROUPS.map((g) => (
                <div
                  key={g.key}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"
                >
                  <div className="text-xs font-semibold text-slate-200 mb-1">
                    {g.title}
                  </div>
                  <StatusPill status={coverage[g.key]} />
                </div>
              ))}
            </div>
          </div>

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
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
                {GROUPS.map((group) => {
                  const groupDocs = documents.filter((d) =>
                    group.types.includes(
                      String(d.document_type || "").toLowerCase()
                    )
                  );

                  return (
                    <div key={group.key}>
                      <div className="mb-2">
                        <div className="text-xs font-semibold text-slate-200">
                          {group.title}
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
