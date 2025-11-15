import React from "react";
import Link from "next/link";
import { Client } from "pg";
import {
  ShieldCheck,
  WarningCircle,
  FileText,
  ClockCountdown,
} from "@phosphor-icons/react";

// --------- Risk helper (reuse dashboard logic) ----------
function parseExpiration(dateStr) {
  if (!dateStr) return null;
  const [mm, dd, yyyy] = dateStr.split("/");
  if (!mm || !dd || !yyyy) return null;
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
}

function computeDaysLeft(dateStr) {
  const d = parseExpiration(dateStr);
  if (!d) return null;
  return Math.floor((d - new Date()) / (1000 * 60 * 60 * 24));
}

function computeRiskSummary(policies) {
  if (!policies || policies.length === 0) {
    return {
      total: 0,
      expired: 0,
      expSoon: 0,
      latestExpiration: null,
      baseRiskScore: 0,
      riskTier: "Unknown",
    };
  }

  const now = new Date();
  let expired = 0;
  let expSoon = 0;
  const validDates = [];

  policies.forEach((p) => {
    if (!p.expiration_date) return;
    const d = parseExpiration(p.expiration_date);
    if (!d || Number.isNaN(d.getTime())) return;
    validDates.push(d);

    if (d < now) {
      expired++;
    } else {
      const diffDays = Math.floor((d - now) / (1000 * 60 * 60 * 24));
      if (diffDays <= 60) expSoon++;
    }
  });

  let baseRiskScore = 85;
  if (expired > 0) baseRiskScore = 25;
  else if (expSoon > 0) baseRiskScore = 55;

  const riskTier =
    baseRiskScore >= 80
      ? "Low"
      : baseRiskScore >= 50
      ? "Moderate"
      : "High";

  const latestExpiration = validDates.length
    ? validDates.sort((a, b) => b - a)[0].toISOString().slice(0, 10)
    : null;

  return {
    total: policies.length,
    expired,
    expSoon,
    latestExpiration,
    baseRiskScore,
    riskTier,
  };
}

// --------- SSR: fetch vendor + policies ----------
export async function getServerSideProps({ params }) {
  const vendorId = parseInt(params.id, 10);
  if (Number.isNaN(vendorId)) return { notFound: true };

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  const vendorRes = await client.query(
    `SELECT id, org_id, name, email, phone, address, created_at
     FROM public.vendors
     WHERE id = $1`,
    [vendorId]
  );

  if (vendorRes.rows.length === 0) {
    await client.end();
    return { notFound: true };
  }

  const policiesRes = await client.query(
    `SELECT id,
            vendor_id,
            vendor_name,
            policy_number,
            carrier,
            coverage_type,
            expiration_date,
            effective_date,
            status,
            created_at
     FROM public.policies
     WHERE vendor_id = $1
     ORDER BY created_at DESC`,
    [vendorId]
  );

  await client.end();

  const vendor = vendorRes.rows[0];
  const policies = policiesRes.rows;

  const risk = computeRiskSummary(policies);

  return {
    props: {
      vendor,
      policies,
      risk,
    },
  };
}

// --------- React Page ----------
export default function VendorProfilePage({ vendor, policies, risk }) {
  const { total, expired, expSoon, latestExpiration, baseRiskScore, riskTier } =
    risk;

  const riskPillColor =
    baseRiskScore >= 80
      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/50"
      : baseRiskScore >= 50
      ? "bg-amber-500/10 text-amber-300 border-amber-500/50"
      : "bg-rose-500/10 text-rose-300 border-rose-500/50";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* top accent bar */}
      <div className="h-1 bg-gradient-to-r from-sky-500 via-violet-500 to-emerald-400" />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Breadcrumb */}
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <Link href="/dashboard" className="hover:text-slate-100">
            Dashboard
          </Link>
          <span>›</span>
          <Link href="/vendors" className="hover:text-slate-100">
            Vendors
          </Link>
          <span>›</span>
          <span className="text-slate-200">{vendor.name}</span>
        </div>

        {/* Header row */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Vendor Profile
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              {vendor.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              {vendor.email && <span>{vendor.email}</span>}
              {vendor.phone && (
                <>
                  <span className="opacity-40">•</span>
                  <span>{vendor.phone}</span>
                </>
              )}
              {vendor.address && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="truncate max-w-xs">{vendor.address}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2">
            <div
              className={`inline-flex items-center gap-3 rounded-full border px-4 py-1.5 text-xs font-medium ${riskPillColor}`}
            >
              <ShieldCheck size={16} weight="bold" />
              <span className="uppercase tracking-[0.15em] text-[10px]">
                Risk
              </span>
              <span className="text-sm font-semibold">
                {baseRiskScore || 0}
              </span>
              <span className="text-[11px] opacity-80">{riskTier} risk</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {total === 0
                ? "No policies on file yet."
                : `Tracking ${total} polic${
                    total === 1 ? "y" : "ies"
                  } for this vendor.`}
            </p>
          </div>
        </header>

        {/* Metrics row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total policies"
            value={total}
            description="All COIs on file"
          />
          <MetricCard
            label="Expired"
            value={expired}
            description="Policies past expiration"
            tone={expired > 0 ? "bad" : "neutral"}
          />
          <MetricCard
            label="Expiring ≤ 60 days"
            value={expSoon}
            description="Renewal attention needed"
            tone={expSoon > 0 ? "warn" : "neutral"}
          />
          <MetricCard
            label="Latest expiration"
            value={latestExpiration || "—"}
            description="Most recent expiration date"
          />
        </section>

        {/* Two-column layout */}
        <section className="grid lg:grid-cols-[minmax(0,2.1fr)_minmax(0,3fr)] gap-6">
          {/* LEFT: snapshot + details */}
          <div className="space-y-4">
            {/* AI-like Risk Snapshot */}
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/70 via-slate-950 to-slate-950/95 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <WarningCircle size={18} weight="bold" className="text-amber-400" />
                  <h2 className="text-sm font-semibold text-slate-50">
                    Risk & Coverage Snapshot
                  </h2>
                </div>
                <ClockCountdown size={16} className="text-slate-400" />
              </div>
              <p className="text-xs text-slate-400 mb-3">
                This section will be backed by AI soon — summarizing coverage gaps,
                renewal risk, and recommended actions in plain English.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li>
                  • Baseline risk score:{" "}
                  <span className="font-semibold">{baseRiskScore || 0}</span>{" "}
                  ({riskTier} risk).
                </li>
                <li>
                  • {expired} expired and {expSoon} expiring soon (≤ 60 days)
                  polic{expired + expSoon === 1 ? "y" : "ies"}.
                </li>
                <li>
                  • Latest expiration date:{" "}
                  <span className="font-medium">
                    {latestExpiration || "No date on file"}
                  </span>
                  .
                </li>
              </ul>
            </div>

            {/* Vendor details card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <h3 className="text-sm font-semibold text-slate-50 mb-2">
                Vendor Details
              </h3>
              <dl className="space-y-2 text-xs text-slate-300">
                <DetailRow label="Vendor ID" value={vendor.id} />
                <DetailRow label="Organization ID" value={vendor.org_id ?? "—"} />
                <DetailRow
                  label="Created"
                  value={
                    vendor.created_at
                      ? new Date(vendor.created_at).toLocaleString()
                      : "—"
                  }
                />
                <DetailRow label="Email" value={vendor.email || "—"} />
                <DetailRow label="Phone" value={vendor.phone || "—"} />
                <DetailRow label="Address" value={vendor.address || "—"} />
              </dl>
            </div>
          </div>

          {/* RIGHT: Policy table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-slate-200" />
                <h2 className="text-sm font-semibold text-slate-50">
                  Policy History
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">
                {total} record{total === 1 ? "" : "s"}
              </span>
            </div>

            {policies.length === 0 ? (
              <p className="text-xs text-slate-500">
                No policies yet for this vendor. Upload a COI from the dashboard
                to see it here.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 pr-3 font-medium">Policy #</th>
                      <th className="py-2 pr-3 font-medium">Carrier</th>
                      <th className="py-2 pr-3 font-medium">Coverage</th>
                      <th className="py-2 pr-3 font-medium">Effective</th>
                      <th className="py-2 pr-3 font-medium">Expires</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policies.map((p) => {
                      const daysLeft = computeDaysLeft(p.expiration_date);
                      const expired = daysLeft !== null && daysLeft < 0;
                      const expSoon =
                        daysLeft !== null && daysLeft >= 0 && daysLeft <= 60;

                      return (
                        <tr
                          key={p.id}
                          className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/60 transition"
                        >
                          <td className="py-2 pr-3 text-slate-100">
                            {p.policy_number || "—"}
                          </td>
                          <td className="py-2 pr-3 text-slate-200">
                            {p.carrier || "—"}
                          </td>
                          <td className="py-2 pr-3 text-slate-200">
                            {p.coverage_type || "—"}
                          </td>
                          <td className="py-2 pr-3 text-slate-300">
                            {p.effective_date || "—"}
                          </td>
                          <td className="py-2 pr-3 text-slate-300">
                            {p.expiration_date || "—"}
                          </td>
                          <td className="py-2 pr-3">
                            <StatusPill
                              expired={expired}
                              expSoon={expSoon}
                              rawStatus={p.status}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Back link */}
        <div className="pt-4">
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-slate-100">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------- Small components ----------

function MetricCard({ label, value, description, tone = "neutral" }) {
  const base =
    "rounded-2xl border px-4 py-3 bg-slate-950/70 shadow-sm flex flex-col gap-1";
  const toneClass =
    tone === "bad"
      ? "border-rose-500/40 bg-gradient-to-br from-rose-950/80 via-slate-950 to-slate-950"
      : tone === "warn"
      ? "border-amber-500/40 bg-gradient-to-br from-amber-950/80 via-slate-950 to-slate-950"
      : "border-slate-800/80";

  return (
    <div className={`${base} ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="text-lg font-semibold text-slate-50">{value}</p>
      <p className="text-[11px] text-slate-500">{description}</p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 text-right max-w-[60%] truncate">
        {value ?? "—"}
      </span>
    </div>
  );
}

function StatusPill({ expired, expSoon, rawStatus }) {
  const label = expired
    ? "Expired"
    : expSoon
    ? "Expiring soon"
    : rawStatus || "Active";

  const toneClass = expired
    ? "bg-rose-500/10 text-rose-300 border-rose-500/50"
    : expSoon
    ? "bg-amber-500/10 text-amber-300 border-amber-500/50"
    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/50";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium ${toneClass}`}
    >
      {label}
    </span>
  );
}
