import React from "react";
import Link from "next/link";
import { Client } from "pg";
import OpenAI from "openai";
import {
  ShieldCheck,
  WarningCircle,
  FileText,
} from "@phosphor-icons/react";

/* ============================================================
   HELPERS — EXPIRATION + RISK
============================================================ */

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
  const validExp = [];

  for (const p of policies) {
    if (!p.expiration_date) continue;
    const exp = parseExpiration(p.expiration_date);
    if (!exp) continue;

    validExp.push(exp);

    if (exp < now) expired++;
    else if ((exp - now) / (1000 * 60 * 60 * 24) <= 60) expSoon++;
  }

  let baseRiskScore = expired > 0 ? 25 : expSoon > 0 ? 55 : 85;
  const riskTier =
    baseRiskScore >= 80 ? "Low" : baseRiskScore >= 50 ? "Moderate" : "High";

  const sorted = validExp.sort((a, b) => b - a);
  const latestExpiration = sorted[0]
    ? sorted[0].toISOString().slice(0, 10)
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

/* ============================================================
   SERVER-SIDE LOADING + AI SUMMARY
============================================================ */

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
    `SELECT id, vendor_id, vendor_name, policy_number,
            carrier, coverage_type, expiration_date,
            effective_date, status, created_at
     FROM public.policies
     WHERE vendor_id = $1
     ORDER BY created_at DESC`,
    [vendorId]
  );

  await client.end();

  const vendor = vendorRes.rows[0];
  const policies = policiesRes.rows;
  const risk = computeRiskSummary(policies);

  /* ============================================================
     AI SUMMARY BLOCK
  ============================================================ */

  let aiSummary = null;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
You are a ruthless but accurate commercial insurance risk analyst.
Your tone is blunt, direct, and focused on preventing risk.
Never hallucinate coverage.

Summarize this vendor’s insurance posture in 4–6 sentences.

Vendor: ${vendor.name}
Total COIs: ${risk.total}
Expired: ${risk.expired}
Expiring soon: ${risk.expSoon}
Latest expiration: ${risk.latestExpiration}
Risk tier: ${risk.riskTier}

Policies:
${JSON.stringify(
  policies.map((p) => ({
    policy_number: p.policy_number,
    carrier: p.carrier,
    type: p.coverage_type,
    exp: p.expiration_date,
    status: p.status,
  })),
  null,
  2
)}

Tone example:
“This vendor is a compliance grenade waiting to blow. Expired policies, missing coverage, and sloppy renewals.”

Now: summarize based ONLY on real data.
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are an internal risk analyst. No hallucinations. No vendor-facing tone.",
        },
        { role: "user", content: prompt },
      ],
    });

    aiSummary = completion.choices[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("AI summary error:", err);
  }

  return {
    props: {
      vendor,
      policies,
      risk,
      aiSummary,
    },
  };
}

/* ============================================================
   PAGE COMPONENT — DARK HYBRID
============================================================ */

export default function VendorProfilePage({ vendor, policies, risk, aiSummary }) {
  const { total, expired, expSoon, latestExpiration, baseRiskScore, riskTier } =
    risk;

  const riskColor =
    baseRiskScore >= 80
      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40"
      : baseRiskScore >= 50
      ? "bg-amber-500/10 text-amber-300 border-amber-500/40"
      : "bg-rose-500/10 text-rose-300 border-rose-500/40";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="h-1 bg-gradient-to-r from-sky-500 via-purple-500 to-emerald-400" />

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
        
        {/* Breadcrumb */}
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <Link href="/dashboard" className="hover:text-slate-100">Dashboard</Link>
          <span>›</span>
          <Link href="/vendors" className="hover:text-slate-100">Vendors</Link>
          <span>›</span>
          <span className="text-slate-200">{vendor.name}</span>
        </div>

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Vendor Profile
            </p>
            <h1 className="text-4xl font-semibold">{vendor.name}</h1>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
              {vendor.email && <span>{vendor.email}</span>}
              {vendor.phone && <span>• {vendor.phone}</span>}
              {vendor.address && <span className="truncate max-w-sm">• {vendor.address}</span>}
            </div>

            {/* ⭐ AI COI CHAT BUTTON */}
            <Link
              href={`/vendor/chat/${vendor.id}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-600 text-slate-950 text-xs font-semibold shadow hover:bg-sky-500 transition mt-3"
            >
              Ask This Vendor’s COIs →
            </Link>
          </div>

          {/* RISK PILL */}
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${riskColor}`}>
            <ShieldCheck size={16} weight="bold" />
            <span className="uppercase tracking-[0.15em] text-[10px]">Risk</span>
            <span className="text-sm font-semibold">{baseRiskScore}</span>
            <span className="text-[11px] opacity-70">{riskTier} Risk</span>
          </div>
        </div>

        {/* METRICS */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total policies" value={total} />
          <MetricCard label="Expired" value={expired} tone={expired > 0 ? "bad" : "neutral"} />
          <MetricCard label="Expiring ≤ 60 days" value={expSoon} tone={expSoon > 0 ? "warn" : "neutral"} />
          <MetricCard label="Latest expiration" value={latestExpiration || "—"} />
        </section>

        {/* MAIN LAYOUT */}
        <section className="grid lg:grid-cols-[1.8fr_2.2fr] gap-8">
          
          {/* LEFT COLUMN */}
          <div className="space-y-6">

            {/* AI SUMMARY */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <WarningCircle size={18} className="text-amber-400" />
                <h2 className="text-sm font-semibold">G-Mode Analyst</h2>
              </div>

              {aiSummary ? (
                <p className="text-sm leading-relaxed text-slate-200">{aiSummary}</p>
              ) : (
                <p className="text-xs text-slate-500">AI summary unavailable.</p>
              )}
            </div>

            {/* VENDOR DETAILS */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <h3 className="text-sm font-semibold mb-3">Vendor Details</h3>
              <dl className="space-y-2 text-xs text-slate-300">
                <DetailRow label="Vendor ID" value={vendor.id} />
                <DetailRow label="Org ID" value={vendor.org_id || "—"} />
                <DetailRow label="Created" value={new Date(vendor.created_at).toLocaleString()} />
                <DetailRow label="Email" value={vendor.email || "—"} />
                <DetailRow label="Phone" value={vendor.phone || "—"} />
                <DetailRow label="Address" value={vendor.address || "—"} />
              </dl>
            </div>
          </div>

          {/* RIGHT COLUMN: POLICY HISTORY */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={20} className="text-slate-200" />
              <h2 className="text-sm font-semibold">Policy History</h2>
            </div>

            {policies.length === 0 ? (
              <p className="text-xs text-slate-500">No policies on file.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 pr-4">Policy #</th>
                      <th className="py-2 pr-4">Carrier</th>
                      <th className="py-2 pr-4">Coverage</th>
                      <th className="py-2 pr-4">Effective</th>
                      <th className="py-2 pr-4">Expires</th>
                      <th className="py-2 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policies.map((p) => {
                      const daysLeft = computeDaysLeft(p.expiration_date);
                      const expired = daysLeft !== null && daysLeft < 0;
                      const soon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 60;

                      return (
                        <tr key={p.id} className="border-b border-slate-900/60 hover:bg-slate-900/60 transition">
                          <td className="py-2 pr-4 text-slate-100">{p.policy_number || "—"}</td>
                          <td className="py-2 pr-4 text-slate-200">{p.carrier}</td>
                          <td className="py-2 pr-4 text-slate-200">{p.coverage_type}</td>
                          <td className="py-2 pr-4 text-slate-300">{p.effective_date}</td>
                          <td className="py-2 pr-4 text-slate-300">{p.expiration_date}</td>
                          <td className="py-2 pr-4">
                            <StatusPill expired={expired} expSoon={soon} rawStatus={p.status} />
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

        {/* BACK LINK */}
        <div className="pt-4">
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-slate-100">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SMALL COMPONENTS
============================================================ */

function MetricCard({ label, value, tone = "neutral" }) {
  const toneClass =
    tone === "bad"
      ? "border-rose-500/40 bg-rose-950/50"
      : tone === "warn"
      ? "border-amber-500/40 bg-amber-950/50"
      : "border-slate-800/80 bg-slate-950/60";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-[0.15em] text-slate-400">{label}</p>
      <p className="text-lg font-semibold text-slate-50">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between text-xs text-slate-300">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[60%] text-right truncate">{value}</span>
    </div>
  );
}

function StatusPill({ expired, expSoon, rawStatus }) {
  const label = expired
    ? "Expired"
    : expSoon
    ? "Expiring Soon"
    : rawStatus || "Active";

  const cls =
    expired
      ? "bg-rose-500/10 text-rose-300 border-rose-500/40"
      : expSoon
      ? "bg-amber-500/10 text-amber-300 border-amber-500/40"
      : "bg-emerald-500/10 text-emerald-300 border-emerald-500/40";

  return (
    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  );
}
