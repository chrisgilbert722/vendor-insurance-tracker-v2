import React from "react";
import Link from "next/link";
import { Client } from "pg";

// Server-side: fetch vendor + policies for this vendor
export async function getServerSideProps({ params }) {
  const vendorId = parseInt(params.id, 10);

  if (Number.isNaN(vendorId)) {
    return { notFound: true };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  // get vendor
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

  const vendor = vendorRes.rows[0];

  // get all policies for that vendor
  const policiesRes = await client.query(
    `SELECT id,
            policy_number,
            carrier,
            effective_date,
            expiration_date,
            coverage_type,
            status,
            created_at
     FROM public.policies
     WHERE vendor_id = $1
     ORDER BY created_at DESC`,
    [vendorId]
  );

  await client.end();

  const policies = policiesRes.rows;

  // simple derived metrics for now
  const totalPolicies = policies.length;
  const now = new Date();

  const expiredCount = policies.filter((p) => {
    if (!p.expiration_date) return false;
    const d = new Date(p.expiration_date);
    return !Number.isNaN(d.getTime()) && d < now;
  }).length;

  const expiringSoonCount = policies.filter((p) => {
    if (!p.expiration_date) return false;
    const d = new Date(p.expiration_date);
    if (Number.isNaN(d.getTime())) return false;
    const diffDays = Math.floor((d - now) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 60;
  }).length;

  const latestExpiration = (() => {
    const validDates = policies
      .map((p) => new Date(p.expiration_date))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => b - a);
    return validDates[0]?.toISOString().slice(0, 10) || null;
  })();

  // basic risk placeholder for now – we’ll replace with AI risk in the next phase
  const baseRiskScore = (() => {
    if (totalPolicies === 0) return 0;
    if (expiredCount > 0) return 25;
    if (expiringSoonCount > 0) return 55;
    return 85;
  })();

  return {
    props: {
      vendor,
      policies,
      metrics: {
        totalPolicies,
        expiredCount,
        expiringSoonCount,
        latestExpiration,
        baseRiskScore,
      },
    },
  };
}

export default function VendorProfilePage({ vendor, policies, metrics }) {
  const {
    totalPolicies,
    expiredCount,
    expiringSoonCount,
    latestExpiration,
    baseRiskScore,
  } = metrics;

  const riskTier =
    baseRiskScore >= 80
      ? "Low"
      : baseRiskScore >= 50
      ? "Moderate"
      : "High";

  const riskColor =
    baseRiskScore >= 80
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : baseRiskScore >= 50
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-rose-50 text-rose-800 border-rose-200";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* top gradient bar */}
      <div className="h-1 bg-gradient-to-r from-sky-500 via-violet-500 to-emerald-400" />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* breadcrumb */}
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <Link href="/dashboard" className="hover:text-slate-200">
            Dashboard
          </Link>
          <span>›</span>
          <Link href="/vendors" className="hover:text-slate-200">
            Vendors
          </Link>
          <span>›</span>
          <span className="text-slate-200">{vendor.name}</span>
        </div>

        {/* header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Vendor Profile
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              {vendor.name}
            </h1>
            <div className="flex flex-wrap gap-2 text-sm text-slate-300">
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
                  <span className="truncate max-w-xs">
                    {vendor.address}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2">
            <div
              className={`inline-flex items-center gap-3 rounded-full border px-4 py-1.5 text-xs font-medium ${riskColor}`}
            >
              <span className="uppercase tracking-[0.15em] text-[10px]">
                Risk
              </span>
              <span className="text-sm font-semibold">
                {baseRiskScore}
              </span>
              <span className="text-[11px] opacity-80">{riskTier} risk</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {totalPolicies === 0
                ? "No policies on file yet."
                : `Tracking ${totalPolicies} policies for this vendor.`}
            </p>
          </div>
        </header>

        {/* metrics row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total policies"
            value={totalPolicies}
            description="All COIs on file"
          />
          <MetricCard
            label="Expired"
            value={expiredCount}
            description="Policies past expiration"
            tone={expiredCount > 0 ? "bad" : "neutral"}
          />
          <MetricCard
            label="Expiring ≤ 60 days"
            value={expiringSoonCount}
            description="Renewal attention needed"
            tone={expiringSoonCount > 0 ? "warn" : "neutral"}
          />
          <MetricCard
            label="Latest expiration"
            value={latestExpiration || "—"}
            description="Most recent expiration date"
          />
        </section>

        {/* layout: left summary, right table */}
        <section className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6">
          {/* left column: AI summary placeholder & details */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/60 via-slate-950 to-slate-950/90 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
              <h2 className="text-sm font-semibold text-slate-50 mb-1">
                Risk & Coverage Snapshot
              </h2>
              <p className="text-xs text-slate-400 mb-3">
                This section will be powered by AI in the next phase — giving
                you a written summary of coverage gaps, trends, and next best
                actions for this vendor.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li>
                  • Current baseline risk score:{" "}
                  <span className="font-medium">{baseRiskScore}</span>{" "}
                  ({riskTier} risk).
                </li>
                <li>
                  • {expiredCount} expired and {expiringSoonCount} expiring
                  soon policies.
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

            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <h3 className="text-sm font-semibold text-slate-50 mb-2">
                Vendor Details
              </h3>
              <dl className="space-y-2 text-xs text-slate-300">
                <DetailRow label="Vendor ID" value={vendor.id} />
                <DetailRow
                  label="Organization ID"
                  value={vendor.org_id ?? "—"}
                />
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

          {/* right column: policies table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-50">
                Policy History
              </h2>
              <span className="text-[11px] text-slate-500">
                {totalPolicies} record{totalPolicies === 1 ? "" : "s"}
              </span>
            </div>

            {policies.length === 0 ? (
              <p className="text-xs text-slate-500">
                No policies yet for this vendor. Upload a COI from the
                dashboard to see it here.
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
                      const expired = isExpired(p.expiration_date);
                      const expSoon = isExpiringSoon(p.expiration_date);
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-slate-850/60 last:border-0 hover:bg-slate-900/60 transition"
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
      </div>
    </div>
  );
}

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

function isExpired(expirationDate) {
  if (!expirationDate) return false;
  const d = new Date(expirationDate);
  if (Number.isNaN(d.getTime())) return false;
  return d < new Date();
}

function isExpiringSoon(expirationDate) {
  if (!expirationDate) return false;
  const d = new Date(expirationDate);
  if (Number.isNaN(d.getTime())) return false;
  const diffDays = Math.floor((d - new Date()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 60;
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
