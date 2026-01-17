// pages/vendor/portal/[token].js
// ============================================================
// VENDOR PORTAL PAGE — V1 (READ + UPLOAD)
// - Renders vendor-facing portal UI
// - Loads data from /api/vendor/portal/[token]
// - This is the missing piece that fixes the email link 404
// ============================================================

import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function VendorPortalPage() {
  const router = useRouter();
  const { token } = router.query;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function loadPortal() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/vendor-portal/portal/${token}`);
        const json = await res.json();

        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Invalid or expired portal link");
        }

        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPortal();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return <Centered>Loading vendor portal…</Centered>;
  }

  if (error) {
    return (
      <Centered>
        <h2>Portal Error</h2>
        <p>{error}</p>
      </Centered>
    );
  }

  const { vendor, policies } = data;

  return (
    <div style={shell}>
      <div style={card}>
        <h1 style={{ marginBottom: 4 }}>{vendor.vendor_name || vendor.name}</h1>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>
          Upload your updated Certificate of Insurance (COI)
        </p>

        <hr style={hr} />

        <section>
          <h3>Policies on File</h3>
          {policies.length === 0 ? (
            <p style={muted}>No policies currently on file.</p>
          ) : (
            <ul>
              {policies.map((p) => (
                <li key={p.id}>
                  {p.coverage_type} — expires {p.expiration_date || "unknown"}
                </li>
              ))}
            </ul>
          )}
        </section>

        <hr style={hr} />

        <section>
          <h3>Upload COI</h3>
          <p style={muted}>
            Upload a PDF of your updated Certificate of Insurance.
          </p>

          <form
            method="POST"
            action="/api/vendor-portal/upload-coi"
            encType="multipart/form-data"
          >
            <input type="hidden" name="token" value={token} />
            <input type="file" name="file" required />
            <br />
            <button style={button} type="submit">
              Upload COI
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

/* ---------------- UI helpers ---------------- */

function Centered({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#020617",
        color: "#e5e7eb",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div>{children}</div>
    </div>
  );
}

const shell = {
  minHeight: "100vh",
  background: "radial-gradient(circle at top left,#020617,#000)",
  color: "#e5e7eb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const card = {
  maxWidth: 520,
  width: "100%",
  background: "rgba(15,23,42,0.95)",
  borderRadius: 16,
  padding: 24,
  border: "1px solid rgba(148,163,184,0.35)",
};

const hr = {
  border: "none",
  borderTop: "1px solid rgba(148,163,184,0.2)",
  margin: "20px 0",
};

const muted = {
  color: "#9ca3af",
  fontSize: 14,
};

const button = {
  marginTop: 12,
  padding: "10px 16px",
  borderRadius: 8,
  background: "#22c55e",
  border: "none",
  color: "#022c22",
  fontWeight: 700,
  cursor: "pointer",
};
