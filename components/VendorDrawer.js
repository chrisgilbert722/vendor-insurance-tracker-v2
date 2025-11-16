import { useEffect, useState } from "react";
import Link from "next/link";
import {
  X as XIcon,
  ShieldWarning,
  ShieldCheck,
  WarningCircle,
  FileText,
  ListBullets,
} from "@phosphor-icons/react";

/**
 * VendorDrawer
 * - Props:
 *    vendor: { id, name, email, phone, address, org_id, ... }
 *    policies: [ { id, policy_number, carrier, coverage_type, expiration_date, status, ... }, ... ]
 *    onClose: () => void
 *
 * This is an INTERNAL VIEW ONLY. G-Mode tone is for your team, NOT sent to vendors.
 */
export default function VendorDrawer({ vendor, policies, onClose }) {
  const [compliance, setCompliance] = useState(null);
  const [complianceLoading, setComplianceLoading] = useState(true);
  const [complianceError, setComplianceError] = useState("");

  useEffect(() => {
    if (!vendor?.id) return;

    async function loadCompliance() {
      setComplianceLoading(true);
      setComplianceError("");
      try {
        const res = await fetch(`/api/requirements/check?vendorId=${vendor.id}`);
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Failed to load compliance");
        }
        setCompliance(data);
      } catch (err) {
        console.error("VendorDrawer compliance error:", err);
        setComplianceError(err.message || "Compliance check failed");
      } finally {
        setComplianceLoading(false);
      }
    }

    loadCompliance();
  }, [vendor?.id]);

  if (!vendor) return null;

  const missingCount = compliance?.missing?.length || 0;
  const totalReqs = compliance?.requirements?.length || 0;
  const hasReqs = totalReqs > 0;
  const passedCount = hasReqs ? totalReqs - missingCount : 0;
  const complianceScore = hasReqs
    ? Math.round((passedCount / totalReqs) * 100)
    : null;

  const isCompliant = hasReqs && missingCount === 0;

  return (
    <div className="fixed inset-0 z-[100] flex">
      {/* Dimmed backdrop */}
      <div
        className="flex-1 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-slate-950 text-slate-50 shadow-2xl border-l border-slate-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/90">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Vendor
            </p>
            <h2 className="text-lg font-semibold">{vendor.name}</h2>
            <p className="text-[11px] text-slate-500">
              ID: {vendor.id} {vendor.org_id ? `· Org: ${vendor.org_id}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition"
          >
            <XIcon size={20} weight="bold" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* COMPLIANCE BADGE SUMMARY */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {isCompliant ? (
                <ShieldCheck className="text-emerald-400" size={18} weight="fill" />
              ) : (
                <ShieldWarning className="text-rose-400" size={18} weight="fill" />
              )}
              <div>
                <p className="text-xs font-semibold">
                  {isCompliant
                    ? "Compliant with org requirements"
                    : hasReqs && missingCount > 0
                    ? "Non-compliant vendor"
                    : "No requirements configured"}
                </p>
                {hasReqs && (
                  <p className="text-[11px] text-slate-500">
                    {passedCount} / {totalReqs} coverages satisfied
                  </p>
                )}
              </div>
            </div>

            {hasReqs && (
              <span
                className={`px-2 py-1 rounded-full text-[11px] font-semibold border ${
                  isCompliant
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                    : "border-rose-500/50 bg-rose-500/10 text-rose-300"
                }`}
              >
                {complianceScore}%
              </span>
            )}
          </div>

          {/* G-MODE COMPLIANCE WARNING (if non-compliant) */}
          {hasReqs && !isCompliant && (
            <div className="rounded-xl border border-rose-800 bg-rose-950/40 p-3">
              <h3 className="text-xs font-semibold text-rose-200 mb-1">
                🚨 G-MODE WARNING
              </h3>
              <p className="text-[11px] text-rose-200 mb-2">
                This vendor fails <strong>{missingCount}</strong> required coverage{" "}
                rule{missingCount > 1 ? "s" : ""}. Treat this vendor as a{" "}
                <strong>high-risk</strong> option until updated COIs close these gaps.
              </p>
              <div className="space-y-2">
                {compliance?.missing?.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-lg border border-rose-700 bg-rose-900/40 p-2"
                  >
                    <p className="text-[11px] text-rose-200 font-semibold">
                      Missing: {m.coverage_type}
                    </p>
                    {m.minimum_limit && (
                      <p className="text-[10px] text-rose-300">
                        Required minimum: ${m.minimum_limit.toLocaleString()}
                      </p>
                    )}
                    <p className="text-[10px] text-rose-400 mt-1 italic">
                      Internal note: Do not allow this vendor onsite until this coverage
                      is documented at or above the required limit.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {complianceLoading && (
            <p className="text-[11px] text-slate-500">
              Checking requirements compliance…
            </p>
          )}
          {complianceError && (
            <p className="text-[11px] text-rose-400">
              ⚠ Compliance engine error: {complianceError}
            </p>
          )}

          {/* CONTACT & META */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="flex items-center gap-2 mb-2">
              <ListBullets size={16} className="text-slate-300" />
              <p className="text-xs font-semibold text-slate-100">
                Contact & Details
              </p>
            </div>
            <dl className="space-y-1 text-[11px] text-slate-300">
              <DetailRow label="Email" value={vendor.email || "—"} />
              <DetailRow label="Phone" value={vendor.phone || "—"} />
              <DetailRow label="Address" value={vendor.address || "—"} />
              <DetailRow
                label="Created"
                value={
                  vendor.created_at
                    ? new Date(vendor.created_at).toLocaleString()
                    : "—"
                }
              />
            </dl>
          </div>

          {/* POLICIES LIST */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-slate-200" />
                <p className="text-xs font-semibold text-slate-100">
                  Policy Snapshot
                </p>
              </div>
              <p className="text-[11px] text-slate-500">
                {policies?.length || 0} record{(policies?.length || 0) === 1 ? "" : "s"}
              </p>
            </div>

            {(!policies || policies.length === 0) ? (
              <p className="text-[11px] text-slate-500">
                No policies on file for this vendor.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {policies.map((p) => {
                  const daysLeft = computeDaysLeft(p.expiration_date);
                  const expired = daysLeft !== null && daysLeft < 0;
                  const soon =
                    daysLeft !== null && daysLeft >= 0 && daysLeft <= 60;

                  return (
                    <div
                      key={p.id}
                      className="rounded-lg border border-slate-800 bg-slate-900/70 p-2"
                    >
                      <p className="text-xs font-semibold text-slate-100">
                        {p.policy_number || "Unknown Policy"}
                      </p>
                      <p className="text-[11px] text-slate-300">
                        {p.coverage_type || "Unknown coverage"} ·{" "}
                        {p.carrier || "Unknown carrier"}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Eff {p.effective_date || "—"} · Exp{" "}
                        {p.expiration_date || "—"}{" "}
                        {daysLeft !== null && (
                          <span>
                            · {expired
                              ? `${Math.abs(daysLeft)}d past`
                              : `${daysLeft}d left`}
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] mt-1">
                        <PolicyStatusPill
                          expired={expired}
                          expSoon={soon}
                          status={p.status}
                        />
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* VIEW FULL PROFILE */}
          <div className="pt-1">
            <Link
              href={`/vendor/${vendor.id}`}
              className="inline-flex items-center justify-center w-full text-xs font-semibold bg-slate-100 text-slate-900 py-2 rounded-xl hover:bg-white transition"
            >
              View Full Profile →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SMALL INTERNAL COMPONENTS
============================================================ */

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className="text-[11px] text-slate-200 text-right truncate max-w-[60%]">
        {value}
      </span>
    </div>
  );
}

function PolicyStatusPill({ expired, expSoon, status }) {
  const label = expired
    ? "Expired"
    : expSoon
    ? "Expiring soon"
    : status || "Active";

  const cls = expired
    ? "bg-rose-500/10 text-rose-300 border-rose-500/60"
    : expSoon
    ? "bg-amber-500/10 text-amber-300 border-amber-500/60"
    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/60";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium ${cls}`}
    >
      {label}
    </span>
  );
}
