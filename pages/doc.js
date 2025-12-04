// pages/doc.js — Document Viewer V3 (Supabase PDF URL via ?url=)
import { useRouter } from "next/router";

export default function DocumentViewerPage() {
  const router = useRouter();
  const { url } = router.query;

  const fileUrl = typeof url === "string" ? url : "";

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000 100%)",
        padding: "24px 32px 32px",
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
            "radial-gradient(circle, rgba(59,130,246,0.35), transparent 60%)",
          filter: "blur(120px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Header */}
      <div style={{ position: "relative", zIndex: 2, marginBottom: 16 }}>
        <div
          style={{
            fontSize: 12,
            color: "#9ca3af",
            marginBottom: 8,
          }}
        >
          <a href="/vendors" style={{ color: "#93c5fd" }}>
            Vendors
          </a>{" "}
          /{" "}
          <span style={{ color: "#9ca3af" }}>COI Document Viewer</span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div
            style={{
              padding: 10,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 30% 0,#38bdf8,#6366f1,#0f172a)",
              boxShadow: "0 0 40px rgba(59,130,246,0.5)",
            }}
          >
            <span style={{ fontSize: 20 }}>📄</span>
          </div>
          <div>
            <div
              style={{
                display: "inline-flex",
                gap: 8,
                padding: "3px 9px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.4)",
                background:
                  "linear-gradient(120deg,rgba(15,23,42,0.9),rgba(15,23,42,0))",
                marginBottom: 4,
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
                COI Viewer
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#38bdf8",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Supabase · PDF
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: 0.15,
              }}
            >
              Certificate of Insurance
            </h1>
            <p
              style={{
                margin: 0,
                marginTop: 4,
                fontSize: 13,
                color: "#cbd5f5",
              }}
            >
              This viewer renders the COI PDF stored in Supabase. Use this for
              underwriting review, endorsements, and audits.
            </p>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "minmax(0,2.3fr) minmax(0,1.2fr)",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        {/* LEFT — PDF FRAME */}
        <div
          style={{
            borderRadius: 24,
            padding: 12,
            background:
              "radial-gradient(circle at top left,rgba(15,23,42,0.97),rgba(15,23,42,0.92))",
            border: "1px solid rgba(148,163,184,0.6)",
            boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
            minHeight: "70vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {!fileUrl ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                color: "#9ca3af",
                textAlign: "center",
                padding: "0 40px",
              }}
            >
              No document URL provided.  
              <br />
              Open a COI from a Vendor or Policy page, or append{" "}
              <code>?url=YOUR_PDF_URL</code> to <code>/doc</code>.
            </div>
          ) : (
            <>
              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  marginBottom: 6,
                }}
              >
                PDF Viewer
              </div>
              <div
                style={{
                  flex: 1,
                  borderRadius: 18,
                  overflow: "hidden",
                  border: "1px solid rgba(30,64,175,0.9)",
                  boxShadow: "0 16px 40px rgba(15,23,42,0.95)",
                  background: "#020617",
                }}
              >
                <iframe
                  src={fileUrl}
                  title="COI PDF"
                  style={{
                    border: "none",
                    width: "100%",
                    height: "100%",
                    minHeight: "70vh",
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* RIGHT — META / SUMMARY */}
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
            gap: 12,
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
            Document info
          </div>

          {fileUrl ? (
            <>
              <div
                style={{
                  fontSize: 12,
                  color: "#e5e7eb",
                  wordBreak: "break-all",
                }}
              >
                <span style={{ color: "#9ca3af" }}>URL:</span> {fileUrl}
              </div>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: "#9ca3af",
                  lineHeight: 1.5,
                }}
              >
                In a future version, this panel will also show:
                <ul style={{ paddingLeft: 16, marginTop: 4 }}>
                  <li>Carrier, policy numbers, and coverage limits</li>
                  <li>Detected endorsements and AI flags</li>
                  <li>Requirements pass/fail summaries</li>
                </ul>
              </div>

              <div style={{ marginTop: "auto" }}>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <button
                    style={{
                      borderRadius: 999,
                      padding: "8px 14px",
                      border: "1px solid rgba(56,189,248,0.9)",
                      background:
                        "radial-gradient(circle at top left,#38bdf8,#0ea5e9,#022c42)",
                      color: "#ecfeff",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Open in new tab
                  </button>
                </a>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              No document loaded yet. Use a link with a Supabase public PDF URL.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
