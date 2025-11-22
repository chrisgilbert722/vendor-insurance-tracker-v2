// pages/admin/vendor/[id].js
import { useMemo } from "react";
import { useRouter } from "next/router";
import { Client } from "pg";

/* ===========================
   UTILS (client-side formatting)
=========================== */

function formatRelative(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const mins = diff / 60000;
  if (mins < 60) return `${Math.round(mins)}m ago`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = hours / 24;
  return `${Math.round(days)}d ago`;
}

function severityColor(sev) {
  switch (sev) {
    case "Critical":
      return { dot: "#fb7185", bg: "rgba(127,29,29,0.95)", text: "#fecaca" };
    case "High":
      return { dot: "#facc15", bg: "rgba(113,63,18,0.95)", text: "#fef9c3" };
    case "Medium":
      return { dot: "#38bdf8", bg: "rgba(15,23,42,0.95)", text: "#e0f2fe" };
    case "Low":
      return { dot: "#22c55e", bg: "rgba(22,101,52,0.95)", text: "#bbf7d0" };
    default:
      return { dot: "#9ca3af", bg: "rgba(15,23,42,0.95)", text: "#e5e7eb" };
  }
}

/* ===========================
   PAGE COMPONENT
=========================== */

export default function VendorProfilePage({ vendor, policies, documents }) {
  const router = useRouter();

  const derived = useMemo(() => {
    if (!vendor) return null;

    const score = vendor.compliance_score ?? 72;
    const status = vendor.status || (score >= 85 ? "Compliant" : score >= 75 ? "Needs Review" : "At Risk");

    // Basic requirements snapshot derived from policies
    const totalReq = policies.length || 10;
    const failing = policies.filter((p) => p.status && p.status.toLowerCase() !== "active").length;
    const passing = totalReq - failing;

    return {
      score,
      status,
      requirements: {
        total: totalReq,
        passing,
        failing,
      },
    };
  }, [vendor, policies]);

  if (!vendor || !derived) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000 100%)",
          padding: "30px 40px 40px",
          color: "#e5e7eb",
        }}
      >
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Vendor not found</h1>
        <p style={{ fontSize: 13, color: "#cbd5f5", marginBottom: 16 }}>
          We could not find a vendor for id <code>{router.query.id}</code>.{" "}
          <a href="/vendors" style={{ color: "#93c5fd" }}>
            Back to Vendors
          </a>
        </p>
      </div>
    );
  }

  const { score, status, requirements } = derived;

  const tags = [
    vendor.category || "Contractor",
    vendor.email ? "Email on file" : "Missing email",
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000 100%)",
        padding: "30px 40px 40px",
        color: "#e5e7eb",
        overflowX: "hidden",
      }}
    >
      {/* HEADER / BREADCRUMB */}
      <div style={{ position: "relative", zIndex: 2, marginBottom: 18 }}>
        <div
          style={{
            fontSize: 12,
            color: "#9ca3af",
            marginBottom: 8,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <a href="/vendors" style={{ color: "#93c5fd" }}>
            Vendors
          </a>
          <span>/</span>
          <span>{vendor.name}</span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              padding: 12,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 30% 0,#3b82f6,#6366f1,#0f172a)",
              boxShadow: "0 0 40px rgba(59,130,246,0.5)",
            }}
          >
            <span style={{ fontSize: 22 }}>🏢</span>
          </div>
          <div>
            <div
              style={{
                display: "inline-flex",
                gap: 8,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.4)",
                background:
                  "linear-gradient(120deg,rgba(15,23,42,0.9),rgba(15,23,42,0))",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "#9ca3af",
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                }}
              >
                Vendor Compliance Profile
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#38bdf8",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Coverage · Risk · Activity
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: 0.2,
              }}
            >
              {vendor.name}
            </h1>
            <div
              style={{
                marginTop: 4,
                fontSize: 13,
                color: "#cbd5f5",
              }}
            >
              {vendor.location || "Location not set"} ·{" "}
              {vendor.category || "Vendor"}
            </div>

            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    borderRadius: 999,
                    padding: "3px 8px",
                    border: "1px solid rgba(51,65,85,0.9)",
                    background: "rgba(15,23,42,0.9)",
                    fontSize: 11,
                    color: "#9ca3af",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TOP ROW — SCORE + SNAPSHOT + ACTIONS */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "minmax(0,2fr) minmax(0,1.2fr)",
          gap: 18,
          marginBottom: 18,
        }}
      >
        {/* SCORE + REQUIREMENTS */}
        <div
          style={{
            borderRadius: 24,
            padding: 16,
            background:
              "radial-gradient(circle at top left,rgba(15,23,42,0.97),rgba(15,23,42,0.92))",
            border: "1px solid rgba(148,163,184,0.6)",
            boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
            display: "grid",
            gridTemplateColumns: "260px minmax(0,1fr)",
            gap: 16,
            alignItems: "center",
          }}
        >
          <ScoreGauge score={score} status={status} />
          <RequirementsSnapshot requirements={requirements} />
        </div>

        {/* ACTIONS */}
        <div
          style={{
            borderRadius: 24,
            padding: 16,
            background:
              "radial-gradient(circle at top right,rgba(15,23,42,0.96),rgba(15,23,42,1))",
            border: "1px solid rgba(148,163,184,0.55)",
            boxShadow: "0 22px 55px rgba(15,23,42,0.98)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: "#9ca3af",
            }}
          >
            Actions
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
            }}
          >
            <a href={`/upload-coi?vendorId=${vendor.id}`}>
              <button
                style={{
                  borderRadius: 999,
                  padding: "8px 14px",
                  border: "1px solid rgba(59,130,246,0.9)",
                  background:
                    "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
                  color: "#e5f2ff",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Upload COI
              </button>
            </a>
          </div>
        </div>
      </div>

      {/* BOTTOM GRID — POLICIES & DOCUMENTS */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1.4fr)",
          gap: 18,
        }}
      >
        {/* LEFT: POLICIES */}
        <div
          style={{
            borderRadius: 24,
            padding: 16,
            background:
              "radial-gradient(circle at top left,rgba(15,23,42,0.97),rgba(15,23,42,0.92))",
            border: "1px solid rgba(148,163,184,0.6)",
            boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              color: "#9ca3af",
              letterSpacing: 1.2,
              marginBottom: 4,
            }}
          >
            Policies for this vendor
          </div>
          <div style={{ fontSize: 13, color: "#e5e7eb", marginBottom: 8 }}>
            Policies discovered / created from uploaded COIs.
          </div>

          {policies.length === 0 ? (
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              No policies recorded yet. Upload a COI to create a policy record.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {policies.map((p) => (
                <PolicyRow key={p.id} policy={p} />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: DOCUMENTS */}
        <div
          style={{
            borderRadius: 24,
            padding: 16,
            background:
              "radial-gradient(circle at top right,rgba(15,23,42,0.96),rgba(15,23,42,1))",
            border: "1px solid rgba(148,163,184,0.55)",
            boxShadow: "0 22px 55px rgba(15,23,42,0.98)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: "#9ca3af",
              marginBottom: 6,
            }}
          >
            COIs & documents
          </div>
          {documents.length === 0 ? (
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              No documents stored yet. Once wired, this will list COIs and
              endorsements stored in Supabase.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {documents.map((doc) => (
                <DocumentRowDB key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===========================
   SUBCOMPONENTS
=========================== */

function ScoreGauge({ score, status }) {
  return (
    <div
      style={{
        position: "relative",
        width: 220,
        height: 220,
        borderRadius: "999px",
        background:
          "conic-gradient(from 220deg,#22c55e,#facc15,#fb7185,#0f172a 70%)",
        padding: 12,
        boxShadow:
          "0 0 70px rgba(34,197,94,0.3),0 0 70px rgba(248,113,113,0.2)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 18,
          borderRadius: "999px",
          background:
            "radial-gradient(circle at 30% 0,#0f172a,#020617 70%,#000)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            color: "#9ca3af",
            letterSpacing: 1.2,
            marginBottom: 6,
          }}
        >
          Score
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            background:
              score >= 85
                ? "linear-gradient(120deg,#22c55e,#a3e635)"
                : score >= 75
                ? "linear-gradient(120deg,#facc15,#f97316)"
                : "linear-gradient(120deg,#ef4444,#fb7185)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          {score}
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>out of 100 · {status}</div>
      </div>
    </div>
  );
}

function RequirementsSnapshot({ requirements }) {
  const { total, passing, failing } = requirements;
  const pct = total > 0 ? Math.round((passing / total) * 100) : 0;

  return (
    <div>
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          color: "#9ca3af",
          letterSpacing: 1.2,
          marginBottom: 6,
        }}
      >
        Requirements Snapshot
      </div>
      <div
        style={{
          fontSize: 13,
          color: "#e5e7eb",
          marginBottom: 8,
        }}
      >
        {passing}/{total} passing ·{" "}
        <span style={{ color: "#f97316" }}>{failing} open gaps</span>
      </div>

      <div
        style={{
          width: "100%",
          height: 8,
          borderRadius: 999,
          background: "rgba(15,23,42,1)",
          overflow: "hidden",
          border: "1px solid rgba(30,64,175,0.9)",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background:
              "linear-gradient(90deg,#22c55e,#a3e635,#facc15,#fb7185)",
          }}
        />
      </div>
    </div>
  );
}

function PolicyRow({ policy }) {
  const status = policy.status || "active";
  const sev =
    status.toLowerCase() === "active"
      ? "Low"
      : status.toLowerCase() === "expired"
      ? "High"
      : "Medium";
  const pal = severityColor(sev);

  return (
    <div
      style={{
        borderRadius: 14,
        padding: "8px 10px",
        background: "rgba(15,23,42,0.96)",
        border: `1px solid ${pal.dot}`,
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        fontSize: 12,
      }}
    >
      <div>
        <div style={{ color: "#e5e7eb", marginBottom: 2 }}>
          {policy.coverage_type || "Policy"}
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          {policy.carrier || "Unknown carrier"} ·{" "}
          {policy.policy_number || "No policy #"}
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
          Eff: {policy.effective_date || "—"} · Exp:{" "}
          {policy.expiration_date || "—"}
        </div>
      </div>
      <div
        style={{
          textAlign: "right",
          fontSize: 11,
          color: pal.text,
        }}
      >
        <span
          style={{
            padding: "2px 7px",
            borderRadius: 999,
            border: `1px solid ${pal.dot}`,
            background: pal.bg,
          }}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

function DocumentRowDB({ doc }) {
  const name =
    doc.name || doc.file_name || doc.filename || `Document #${doc.id}`;
  const type = doc.type || doc.doc_type || "Document";
  const uploaded = doc.uploaded_at || doc.created_at || doc.inserted_at;

  return (
    <div
      style={{
        borderRadius: 14,
        padding: "8px 10px",
        border: "1px solid rgba(55,65,81,0.9)",
        background: "rgba(15,23,42,0.95)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 12,
      }}
    >
      <div>
        <div style={{ color: "#e5e7eb" }}>{name}</div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          {type} · uploaded {formatRelative(uploaded)}
        </div>
      </div>
      {doc.file_url && (
        <a
          href={doc.file_url}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 11, color: "#93c5fd" }}
        >
          Open
        </a>
      )}
    </div>
  );
}

/* ===========================
   SERVER-SIDE DATA FETCH
=========================== */

export async function getServerSideProps(context) {
  const { id } = context.params || {};
  const vendorId = parseInt(id, 10);

  if (!vendorId || Number.isNaN(vendorId)) {
    return { notFound: true };
  }

  let client;
  try {
    client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();

    // fetch vendor
    const vendorRes = await client.query(
      `SELECT * FROM public.vendors WHERE id = $1`,
      [vendorId]
    );

    if (vendorRes.rows.length === 0) {
      return { notFound: true };
    }

    const vendor = vendorRes.rows[0];

    // fetch policies for this vendor
    let policies = [];
    try {
      const polRes = await client.query(
        `SELECT * FROM public.policies WHERE vendor_id = $1 ORDER BY id DESC LIMIT 25`,
        [vendorId]
      );
      policies = polRes.rows || [];
    } catch (e) {
      console.error("Error fetching policies:", e);
    }

    // fetch documents for this vendor (very generic)
    let documents = [];
    try {
      const docRes = await client.query(
        `SELECT * FROM public.documents WHERE vendor_id = $1 ORDER BY id DESC LIMIT 25`,
        [vendorId]
      );
      documents = docRes.rows || [];
    } catch (e) {
      console.error("Error fetching documents:", e);
    }

    return {
      props: {
        vendor,
        policies,
        documents,
      },
    };
  } catch (err) {
    console.error("VendorProfile getServerSideProps error:", err);
    return { notFound: true };
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (e) {
        // ignore
      }
    }
  }
}

