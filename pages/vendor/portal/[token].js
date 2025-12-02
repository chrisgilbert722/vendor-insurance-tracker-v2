// pages/vendor/portal/[token].js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const GP = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.98)",
  border: "rgba(51,65,85,0.9)",
  neonBlue: "#38bdf8",
  neonGreen: "#22c55e",
  neonGold: "#facc15",
  neonRed: "#fb7185",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
};

export default function VendorPortal() {
  const router = useRouter();
  const { token } = router.query;

  const [loading, setLoading] = useState(true);
  const [vendorData, setVendorData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/vendor/portal?token=${token}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Invalid link");

        setVendorData(json);
      } catch (err) {
        console.error(err);
        setError(err.message || "Could not load vendor portal.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left,#020617 0,#020617 45%,#000000 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: GP.textSoft,
        }}
      >
        <div style={{ fontSize: 18 }}>Loading vendor portal…</div>
      </div>
    );
  }

  if (error || !vendorData) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left,#020617 0,#020617 45%,#000000 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: GP.text,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 50, marginBottom: 10 }}>⚠️</div>
          <div style={{ fontSize: 18, marginBottom: 6 }}>
            This vendor link is not valid.
          </div>
          <div style={{ fontSize: 13, color: GP.textSoft }}>
            Please contact the requesting organization for a new link.
          </div>
        </div>
      </div>
    );
  }

  const { vendor, org, requirements, status, alerts } = vendorData;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000000 100%)",
        padding: "32px 24px 40px",
        color: GP.text,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          maxWidth: 1150,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: GP.textSoft,
              marginBottom: 6,
            }}
          >
            Vendor Compliance Portal
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              background:
                "linear-gradient(90deg,#38bdf8,#a855f7,#22c55e,#facc15)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            {vendor?.name || "Vendor"}
          </h1>
          <div style={{ fontSize: 13, color: GP.textSoft }}>
            For {org?.name || "Requesting Organization"}
          </div>
        </div>

        {/* Status pill */}
        <div
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.6)",
            background: "rgba(15,23,42,0.96)",
            fontSize: 12,
            color: GP.textSoft,
            textAlign: "right",
          }}
        >
          <div style={{ fontSize: 11, textTransform: "uppercase" }}>
            Compliance Status
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color:
                status?.state === "compliant"
                  ? GP.neonGreen
                  : status?.state === "pending"
                  ? GP.neonGold
                  : GP.neonRed,
            }}
          >
            {status?.label || "Pending"}
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div
        style={{
          maxWidth: 1150,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0,1.7fr) minmax(0,1.1fr)",
          gap: 24,
        }}
      >
        {/* LEFT SIDE — UPLOAD + REQUIREMENTS */}
        <div>
          {/* Upload Panel */}
          <div
            style={{
              borderRadius: 22,
              border: `1px solid ${GP.border}`,
              background:
                "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
              padding: 20,
              marginBottom: 18,
              boxShadow:
                "0 0 40px rgba(0,0,0,0.7),0 0 30px rgba(56,189,248,0.25)",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: 8,
                fontSize: 15,
                color: "#e5e7eb",
              }}
            >
              Upload Your Certificate of Insurance
            </h3>
            <p style={{ fontSize: 13, color: GP.textSoft, marginBottom: 14 }}>
              Upload a PDF of your latest COI so we can verify your coverage
              against the requirements below.
            </p>

            {/* Placeholder — will wire actual upload next */}
            <div
              style={{
                borderRadius: 14,
                border: "1px dashed rgba(148,163,184,0.8)",
                padding: 24,
                textAlign: "center",
                background: "rgba(15,23,42,0.96)",
              }}
            >
              <div style={{ fontSize: 26, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 13, color: GP.text }}>
                Drag & drop your COI PDF here
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: GP.textSoft,
                  marginBottom: 14,
                }}
              >
                Or click the button below to select a file.
              </div>
              <button
                type="button"
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "1px solid rgba(56,189,248,0.9)",
                  background:
                    "linear-gradient(90deg,#38bdf8,#0ea5e9,#0f172a)",
                  color: "#e5f2ff",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Choose File (Coming Soon)
              </button>
            </div>
          </div>

          {/* Requirements Panel */}
          <div
            style={{
              borderRadius: 22,
              border: `1px solid ${GP.border}`,
              background:
                "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
              padding: 18,
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: 8,
                fontSize: 15,
                color: "#e5e7eb",
              }}
            >
              Coverage Requirements
            </h3>
            <p style={{ fontSize: 13, color: GP.textSoft, marginBottom: 10 }}>
              These are the minimum coverage types required by{" "}
              <strong style={{ color: GP.neonBlue }}>
                {org?.name || "this organization"}
              </strong>
              .
            </p>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: 13,
                color: GP.textSoft,
              }}
            >
              {(requirements?.coverages || []).map((c, i) => (
                <li key={i}>
                  <strong style={{ color: "#e5e7eb" }}>{c.name}</strong>{" "}
                  {c.limit && `— ${c.limit}`}
                </li>
              ))}
              {(!requirements?.coverages ||
                requirements.coverages.length === 0) && (
                <li>No specific coverage profile loaded yet.</li>
              )}
            </ul>
          </div>
        </div>

        {/* RIGHT SIDE — STATUS + ALERTS */}
        <div>
          {/* Status Block */}
          <div
            style={{
              borderRadius: 22,
              border: `1px solid ${GP.border}`,
              background:
                "radial-gradient(circle at top right,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
              padding: 18,
              marginBottom: 18,
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: 8,
                fontSize: 15,
                color: "#e5e7eb",
              }}
            >
              Your Current Status
            </h3>
            <p style={{ fontSize: 13, color: GP.textSoft, marginBottom: 6 }}>
              {status?.description || "COI not yet uploaded or under review."}
            </p>
          </div>

          {/* Alerts Block */}
          <div
            style={{
              borderRadius: 22,
              border: `1px solid ${GP.border}`,
              background:
                "radial-gradient(circle at 10% 0%,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
              padding: 18,
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: 8,
                fontSize: 15,
                color: "#e5e7eb",
              }}
            >
              Issues to Fix
            </h3>
            {alerts?.length ? (
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: 13,
                  color: GP.textSoft,
                }}
              >
                {alerts.map((a) => (
                  <li key={a.id || a.code}>
                    <strong
                      style={{
                        color:
                          a.severity === "critical"
                            ? GP.neonRed
                            : a.severity === "high"
                            ? GP.neonGold
                            : GP.neonBlue,
                      }}
                    >
                      {a.label || a.code}
                    </strong>
                    : {a.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: 13, color: GP.textSoft }}>
                No issues currently detected.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
