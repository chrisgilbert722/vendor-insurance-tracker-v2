// pages/broker/check.js
import { useRouter } from "next/router";
import { useOrg } from "../../context/OrgContext";
import BrokerCheckPanel from "../../components/broker/BrokerCheckPanel";

export default function BrokerCheckPage() {
  const router = useRouter();
  const { activeOrgId: orgId } = useOrg();

  const vendorId = router.query.vendorId
    ? Number(router.query.vendorId)
    : null;
  const policyId = router.query.policyId
    ? Number(router.query.policyId)
    : null;

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
      {/* AURA */}
      <div
        style={{
          position: "absolute",
          top: -240,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1100,
          height: 1100,
          background:
            "radial-gradient(circle, rgba(59,130,246,0.35), transparent 60%)",
          filter: "blur(120px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          borderRadius: 28,
          padding: 20,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
          border: "1px solid rgba(148,163,184,0.45)",
          boxShadow: `
            0 0 55px rgba(0,0,0,0.85),
            inset 0 0 25px rgba(15,23,42,0.8)
          `,
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              padding: 12,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 30% 0,#0ea5e9,#6366f1,#0f172a)",
              boxShadow: "0 0 40px rgba(56,189,248,0.6)",
            }}
          >
            <span style={{ fontSize: 22 }}>🧾</span>
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
                  "linear-gradient(120deg,rgba(15,23,42,0.9),rgba(15,23,42,0.7))",
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
                Broker Tool
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#38bdf8",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                COI Auto-Checker
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              Auto-check this COI against{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg,#38bdf8,#a855f7,#f97316)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                client requirements
              </span>
              .
            </h1>

            <p
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "#cbd5f5",
                maxWidth: 650,
              }}
            >
              Upload the COI or endorsement and let the system detect missing
              coverages, limits, endorsements, and clauses. Then send a clean,
              AI-written email to your underwriter or internal team.
            </p>

            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
                marginTop: 4,
              }}
            >
              Org:{" "}
              <span style={{ color: "#e5e7eb" }}>
                {orgId || "not set"}
              </span>{" "}
              · Vendor:{" "}
              <span style={{ color: "#e5e7eb" }}>
                {vendorId || "none (add ?vendorId=123)"}
              </span>
            </div>
          </div>
        </div>

        {orgId && vendorId ? (
          <BrokerCheckPanel
            orgId={orgId}
            vendorId={vendorId}
            policyId={policyId}
          />
        ) : (
          <div style={{ fontSize: 12, color: "#fecaca", marginTop: 12 }}>
            Please provide <code>?vendorId=</code> in the URL to target a
            specific vendor.
          </div>
        )}
      </div>
    </div>
  );
}
