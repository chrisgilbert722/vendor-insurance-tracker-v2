// pages/admin/contracts/review.js
// ==========================================================
// CONTRACT REVIEW COCKPIT — ADMIN
// Step 3 UI for Contract Intelligence:
// 1) Upload contract PDF
// 2) Run AI extraction (extract-contract)
// 3) Review insurance requirements + raw clauses
// 4) Apply contract-derived requirements → vendor.requirements_json
// ==========================================================

import { useState } from "react";
import { useOrg } from "../../../context/OrgContext";
import ToastV2 from "../../../components/ToastV2";
import CockpitWizardLayout from "../../../components/CockpitWizardLayout";

export default function ContractReviewPage() {
  const { activeOrgId: orgId } = useOrg();

  const [vendorId, setVendorId] = useState("");
  const [file, setFile] = useState(null);

  const [extractLoading, setExtractLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);

  const [requirementsProfile, setRequirementsProfile] = useState(null);
  const [rawClauses, setRawClauses] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [reason, setReason] = useState("");

  const [toast, setToast] = useState({
    open: false,
    type: "success",
    message: "",
  });

  // ----------------------------------------------------------
  // HANDLERS
  // ----------------------------------------------------------
  function handleFileChange(e) {
    const f = e.target.files?.[0] || null;
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setToast({
        open: true,
        type: "error",
        message: "Please upload a PDF contract.",
      });
      return;
    }
    setFile(f);
  }

  async function handleExtract() {
    if (!orgId) {
      setToast({
        open: true,
        type: "error",
        message: "No active org selected.",
      });
      return;
    }
    if (!vendorId.trim()) {
      setToast({
        open: true,
        type: "error",
        message: "Enter a vendor ID first.",
      });
      return;
    }
    if (!file) {
      setToast({
        open: true,
        type: "error",
        message: "Upload a contract PDF first.",
      });
      return;
    }

    try {
      setExtractLoading(true);
      setRequirementsProfile(null);
      setRawClauses(null);
      setConfidence(null);
      setReason("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("vendorId", vendorId);
      formData.append("orgId", String(orgId));

      const res = await fetch("/api/docs/extract-contract", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to extract contract requirements.");
      }

      setRequirementsProfile(json.requirementsProfile || null);
      setRawClauses(json.rawClauses || null);
      setConfidence(json.confidence ?? null);
      setReason(json.reason || "");

      setToast({
        open: true,
        type: "success",
        message: "Contract requirements extracted.",
      });
    } catch (err) {
      console.error("[ContractReview] extract error:", err);
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to extract contract.",
      });
    } finally {
      setExtractLoading(false);
    }
  }

  async function handleApplyRequirements() {
    if (!orgId) {
      setToast({
        open: true,
        type: "error",
        message: "No active org selected.",
      });
      return;
    }
    if (!vendorId.trim()) {
      setToast({
        open: true,
        type: "error",
        message: "Vendor ID is required.",
      });
      return;
    }
    if (!requirementsProfile) {
      setToast({
        open: true,
        type: "error",
        message: "No extracted requirements to apply.",
      });
      return;
    }

    try {
      setApplyLoading(true);

      const res = await fetch("/api/docs/apply-contract-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: Number(vendorId),
          orgId: Number(orgId),
          requirementsProfile,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to apply contract requirements.");
      }

      setToast({
        open: true,
        type: "success",
        message: "Contract requirements applied to vendor.",
      });
    } catch (err) {
      console.error("[ContractReview] apply error:", err);
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to apply requirements.",
      });
    } finally {
      setApplyLoading(false);
    }
  }

  // ----------------------------------------------------------
  // RENDER HELPERS
  // ----------------------------------------------------------
  function renderRequirements() {
    if (!requirementsProfile) {
      return (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px dashed rgba(148,163,184,0.5)",
            color: "#9ca3af",
            fontSize: 13,
          }}
        >
          No contract requirements extracted yet. Upload a contract and run AI
          extraction.
        </div>
      );
    }

    const coverages = requirementsProfile.coverages || {};

    function renderCoverageBlock(key, label, coverage) {
      if (!coverage) return null;

      return (
        <div
          key={key}
          style={{
            borderRadius: 12,
            padding: 10,
            border: "1px solid rgba(51,65,85,0.8)",
            background: "rgba(15,23,42,0.95)",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
            <div
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 999,
                background: coverage.required
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(148,163,184,0.15)",
                color: coverage.required ? "#4ade80" : "#9ca3af",
                border: coverage.required
                  ? "1px solid rgba(34,197,94,0.7)"
                  : "1px solid rgba(148,163,184,0.7)",
              }}
            >
              {coverage.required ? "Required" : "Not Required"}
            </div>
          </div>

          <div style={{ fontSize: 12, color: "#e5e7eb" }}>
            {coverage.eachOccurrenceLimit && (
              <div>
                Each Occurrence: $
                {coverage.eachOccurrenceLimit.toLocaleString?.() ||
                  coverage.eachOccurrenceLimit}
              </div>
            )}
            {coverage.generalAggregateLimit && (
              <div>
                General Aggregate: $
                {coverage.generalAggregateLimit.toLocaleString?.() ||
                  coverage.generalAggregateLimit}
              </div>
            )}
            {coverage.productsCompletedOpsAggregate && (
              <div>
                Products/Completed Ops Agg: $
                {coverage.productsCompletedOpsAggregate.toLocaleString?.() ||
                  coverage.productsCompletedOpsAggregate}
              </div>
            )}
            {coverage.combinedSingleLimit && (
              <div>
                Combined Single Limit: $
                {coverage.combinedSingleLimit.toLocaleString?.() ||
                  coverage.combinedSingleLimit}
              </div>
            )}
            {coverage.limit && (
              <div>
                Limit: $
                {coverage.limit.toLocaleString?.() || coverage.limit}
              </div>
            )}

            {coverage.waiverOfSubrogationRequired && (
              <div>• Waiver of Subrogation required</div>
            )}
            {coverage.primaryNonContributoryRequired && (
              <div>• Primary & Noncontributory required</div>
            )}
            {coverage.perProjectAggregate && <div>• Per Project Aggregate</div>}
            {coverage.perLocationAggregate && (
              <div>• Per Location Aggregate</div>
            )}
            {coverage.anyAuto && <div>• Any Auto</div>}
            {coverage.hiredNonOwned && <div>• Hired / Non-Owned Auto</div>}
            {coverage.followsForm && <div>• Umbrella follows form</div>}
            {coverage.retroactiveDateRequired && (
              <div>• Retroactive date required</div>
            )}
            {coverage.tailCoverageRequiredYears && (
              <div>
                • Tail coverage required ({coverage.tailCoverageRequiredYears}{" "}
                years)
              </div>
            )}

            {coverage.description && (
              <div style={{ marginTop: 6, color: "#9ca3af" }}>
                {coverage.description}
              </div>
            )}
          </div>
        </div>
      );
    }

    const requiredEndorsements =
      requirementsProfile.requiredEndorsements || [];

    return (
      <div>
        {/* Coverages */}
        {renderCoverageBlock("gl", "General Liability", coverages.generalLiability)}
        {renderCoverageBlock("auto", "Auto Liability", coverages.autoLiability)}
        {renderCoverageBlock("wc", "Workers' Compensation", coverages.workersComp)}
        {renderCoverageBlock("umb", "Umbrella / Excess", coverages.umbrella)}
        {renderCoverageBlock("pl", "Professional Liability", coverages.professionalLiability)}

        {/* Flags */}
        <div style={{ marginTop: 10, fontSize: 12, color: "#e5e7eb" }}>
          {requirementsProfile.additionalInsuredRequired && (
            <div>• Additional Insured required</div>
          )}
          {requirementsProfile.waiverOfSubrogationRequired && (
            <div>• Waiver of Subrogation required</div>
          )}
          {requirementsProfile.primaryNonContributoryRequired && (
            <div>• Primary & Noncontributory required</div>
          )}
          {requirementsProfile.otherInsuranceLanguage && (
            <div style={{ marginTop: 4, color: "#9ca3af" }}>
              Other insurance language:{" "}
              {requirementsProfile.otherInsuranceLanguage}
            </div>
          )}
        </div>

        {/* Required Endorsements */}
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Required Endorsements
          </div>
          {requiredEndorsements.length === 0 ? (
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              None explicitly identified.
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {requiredEndorsements.map((code, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.7)",
                    fontSize: 11,
                    color: "#e5e7eb",
                    background: "rgba(15,23,42,0.95)",
                  }}
                >
                  {code}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        {requirementsProfile.notes && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 10,
              background: "rgba(15,23,42,0.96)",
              border: "1px solid rgba(55,65,81,0.9)",
              fontSize: 12,
              color: "#cbd5f5",
            }}
          >
            <strong>Notes:</strong> {requirementsProfile.notes}
          </div>
        )}
      </div>
    );
  }

  function renderRawClauses() {
    if (!rawClauses) {
      return (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px dashed rgba(148,163,184,0.5)",
            color: "#9ca3af",
            fontSize: 13,
          }}
        >
          No raw clauses extracted yet.
        </div>
      );
    }

    function ClauseBlock({ title, text }) {
      if (!text) return null;
      return (
        <div
          style={{
            marginBottom: 16,
            padding: 10,
            borderRadius: 12,
            border: "1px solid rgba(55,65,81,0.9)",
            background: "rgba(15,23,42,0.97)",
            fontSize: 12,
            color: "#e5e7eb",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 6,
              color: "#e5e7eb",
            }}
          >
            {title}
          </div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontSize: 11,
              color: "#cbd5f5",
            }}
          >
            {text}
          </pre>
        </div>
      );
    }

    return (
      <div>
        <ClauseBlock
          title="Insurance Requirements Clause"
          text={rawClauses.insuranceRequirements}
        />
        <ClauseBlock title="Indemnity Clause" text={rawClauses.indemnity} />
        <ClauseBlock
          title="Waiver of Subrogation Language"
          text={rawClauses.waiverOfSubrogation}
        />
        <ClauseBlock
          title="Additional Insured Language"
          text={rawClauses.additionalInsured}
        />
      </div>
    );
  }

  // -----------------------------------------------------------
  // PAGE RENDER (COCKPIT WRAPPED)
  // -----------------------------------------------------------
  return (
    <CockpitWizardLayout>
      <div style={{ position: "relative", zIndex: 3 }}>
        {/* HEADER */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "inline-flex",
              gap: 8,
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.4)",
              background:
                "linear-gradient(120deg,rgba(15,23,42,0.94),rgba(15,23,42,0.7))",
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: "#9ca3af",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              Contract Intelligence
            </span>
            <span
              style={{
                fontSize: 10,
                color: "#38bdf8",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              AI Requirements Review
            </span>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 600,
            }}
          >
            Review{" "}
            <span
              style={{
                background:
                  "linear-gradient(90deg,#38bdf8,#a855f7,#f97316)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              contract insurance requirements
            </span>{" "}
            before applying.
          </h1>
          <p
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "#9ca3af",
              maxWidth: 720,
            }}
          >
            Upload a contract, let AI extract the insurance requirements and
            indemnity clauses, then apply them as the vendor&apos;s official
            requirements profile.
          </p>
        </div>

        {/* CONTROLS */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end",
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label
              style={{ fontSize: 12, color: "#9ca3af", marginBottom: 2 }}
            >
              Vendor ID
            </label>
            <input
              type="number"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              placeholder="e.g. 123"
              style={{
                minWidth: 160,
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid rgba(148,163,184,0.6)",
                background: "rgba(15,23,42,0.95)",
                color: "#e5e7eb",
                fontSize: 13,
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label
              style={{ fontSize: 12, color: "#9ca3af", marginBottom: 2 }}
            >
              Contract PDF
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              style={{ fontSize: 12 }}
            />
          </div>

          <button
            onClick={handleExtract}
            disabled={extractLoading || !file || !vendorId || !orgId}
            style={{
              padding: "9px 16px",
              borderRadius: 12,
              border: "1px solid rgba(56,189,248,0.8)",
              background:
                extractLoading || !file || !vendorId || !orgId
                  ? "rgba(56,189,248,0.3)"
                  : "linear-gradient(90deg,#38bdf8,#0ea5e9,#1d4ed8)",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor:
                extractLoading || !file || !vendorId || !orgId
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {extractLoading ? "Analyzing contract…" : "⚡ Extract Requirements"}
          </button>

          <button
            onClick={handleApplyRequirements}
            disabled={!requirementsProfile || applyLoading}
            style={{
              padding: "9px 16px",
              borderRadius: 12,
              border: "1px solid #22c55e",
              background: requirementsProfile
                ? "linear-gradient(90deg,#22c55e,#16a34a,#15803d)"
                : "rgba(34,197,94,0.25)",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor:
                !requirementsProfile || applyLoading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {applyLoading
              ? "Applying requirements…"
              : "✅ Apply Requirements to Vendor"}
          </button>
        </div>

        {/* MAIN GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1.4fr)",
            gap: 20,
            alignItems: "flex-start",
          }}
        >
          {/* LEFT: STRUCTURED REQUIREMENTS */}
          <div
            style={{
              borderRadius: 22,
              padding: 18,
              background: "rgba(15,23,42,0.85)",
              border: "1px solid rgba(80,120,255,0.4)",
              boxShadow:
                "0 0 28px rgba(64,106,255,0.25), inset 0 0 18px rgba(15,23,42,0.9)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Extracted Insurance Requirements
            </div>
            {confidence != null && (
              <div
                style={{
                  fontSize: 11,
                  marginBottom: 8,
                  color: "#9ca3af",
                }}
              >
                Confidence:{" "}
                <span style={{ color: "#e5e7eb" }}>
                  {(confidence * 100).toFixed(0)}%
                </span>{" "}
                {reason && <span>· {reason}</span>}
              </div>
            )}
            {renderRequirements()}
          </div>

          {/* RIGHT: RAW CLAUSES */}
          <div
            style={{
              borderRadius: 22,
              padding: 18,
              background: "rgba(15,23,42,0.9)",
              border: "1px solid rgba(30,64,175,0.6)",
              boxShadow:
                "0 0 24px rgba(37,99,235,0.3), inset 0 0 18px rgba(15,23,42,0.95)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Raw Contract Clauses (for Legal Review)
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
                marginBottom: 8,
              }}
            >
              These are the actual contract paragraphs for legal / risk teams to
              review before final approval.
            </div>
            {renderRawClauses()}
          </div>
        </div>

        <ToastV2
          open={toast.open}
          type={toast.type}
          message={toast.message}
          onClose={() =>
            setToast((p) => ({
              ...p,
              open: false,
            }))
          }
        />
      </div>
    </CockpitWizardLayout>
  );
}
