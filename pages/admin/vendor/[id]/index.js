// pages/admin/vendor/[id]/index.js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import VendorRenewalStatusPanel from "../../../../components/renewals/VendorRenewalStatusPanel";
import RenewalCommunicationLog from "../../../../components/renewals/RenewalCommunicationLog";
import RenewalUploadPanel from "../../../../components/renewals/RenewalUploadPanel";
import RenewalPredictionPanel from "../../../../components/renewals/RenewalPredictionPanel";

export default function AdminVendorDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [vendor, setVendor] = useState(null);
  const [org, setOrg] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    async function loadVendor() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/vendors/${id}`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Failed to load vendor.");

        setVendor(data.vendor);
        setOrg(data.organization);
        setPolicies(data.policies || []);
      } catch (err) {
        console.error("[AdminVendorDetailPage] error:", err);
        setError(err.message || "Failed to load vendor.");
      } finally {
        setLoading(false);
      }
    }

    loadVendor();
  }, [id]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left,#020617 0,#020617 45%,#000 100%)",
          padding: "32px 40px",
          color: "#e5e7eb",
        }}
      >
        <h1>Loading vendor…</h1>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left,#020617 0,#020617 45%,#000 100%)",
          padding: "32px 40px",
          color: "#e5e7eb",
        }}
      >
        <h1>{vendor ? "Error" : "Vendor not found"}</h1>
        {error && <p style={{ color: "#fecaca", marginTop: 8 }}>{error}</p>}
      </div>
    );
  }

  const primaryPolicy = policies[0] || null;

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000 100%)",
        padding: "32px 40px 40px",
        color: "#e5e7eb",
      }}
    >
      {/* Aura */}
      <div
        style={{
          position: "absolute",
          top: -260,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1100,
          height: 1100,
          background:
            "radial-gradient(circle, rgba(56,189,248,0.35), transparent 60%)",
          filter: "blur(120px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          borderRadius: 32,
          padding: 22,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.95))",
          border: "1px solid rgba(148,163,184,0.45)",
          boxShadow: `
            0 0 60px rgba(15,23,42,0.95),
            0 0 80px rgba(15,23,42,0.9),
            inset 0 0 22px rgba(15,23,42,0.9)
          `,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: "#9ca3af",
                marginBottom: 6,
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

            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              Vendor Overview:{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg,#38bdf8,#a855f7,#f97316)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                {vendor.name}
              </span>
            </h1>

            {org && (
              <p
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  color: "#9ca3af",
                }}
              >
                Org:{" "}
                <span style={{ color: "#e5e7eb" }}>
                  {org.name || "Unknown"}
                </span>
              </p>
            )}
          </div>

          <button
            onClick={() => router.push(`/admin/vendor/${vendor.id}/fix`)}
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
              whiteSpace: "nowrap",
            }}
          >
            🔧 Open Fix Cockpit
          </button>
        </div>

        {/* Renewal Status + V3 Risk */}
        <div style={{ marginTop: 8 }}>
          <VendorRenewalStatusPanel
            vendorId={vendor.id}
            orgId={vendor.org_id}
            expirationDate={primaryPolicy?.expiration_date}
          />
        </div>

        {/* 🔥 Renewal Upload */}
        <div style={{ marginTop: 30 }}>
          <RenewalUploadPanel
            vendorId={vendor.id}
            orgId={vendor.org_id}
            onComplete={() => router.replace(router.asPath)}
          />
        </div>

        {/* 🔮 AI Renewal Prediction */}
        <div style={{ marginTop: 30 }}>
          <RenewalPredictionPanel
            vendorId={vendor.id}
            orgId={vendor.org_id}
          />
        </div>

        {/* 🔥 Renewal Communication Log */}
        <div style={{ marginTop: 30 }}>
          <RenewalCommunicationLog vendorId={vendor.id} />
        </div>

        {/* Policies */}
        <div style={{ marginTop: 30 }}>
          <h2
            style={{
              margin: 0,
              marginBottom: 8,
              fontSize: 16,
              fontWeight: 600,
              color: "#e5e7eb",
            }}
          >
            Policies
          </h2>

          {policies.length === 0 ? (
            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              No policies found for this vendor.
            </div>
          ) : (
            <div
              style={{
                borderRadius: 18,
                border: "1px solid rgba(30,41,59,0.95)",
                background: "rgba(15,23,42,0.98)",
                overflow: "hidden",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: 0,
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr>
                    <th style={th}>Policy #</th>
                    <th style={th}>Carrier</th>
                    <th style={th}>Coverage</th>
                    <th style={th}>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((p) => (
                    <tr
                      key={p.id}
                      style={{
                        background:
                          "linear-gradient(90deg,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
                      }}
                    >
                      <td style={td}>{p.policy_number || "—"}</td>
                      <td style={td}>{p.carrier || "—"}</td>
                      <td style={td}>{p.coverage_type || "—"}</td>
                      <td style={td}>{p.expiration_date || "—"}</td>
                    </tr>
                  ))}
                </tbody>    {/* ✔ FIX: only one </tbody> */}
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const th = {
  padding: "8px 10px",
  background: "rgba(15,23,42,0.98)",
  color: "#9ca3af",
  fontWeight: 600,
  textAlign: "left",
  fontSize: 12,
  borderBottom: "1px solid rgba(51,65,85,0.8)",
};

const td = {
  padding: "8px 10px",
  borderBottom: "1px solid rgba(51,65,85,0.5)",
  fontSize: 12,
  color: "#e5e7eb",
};
