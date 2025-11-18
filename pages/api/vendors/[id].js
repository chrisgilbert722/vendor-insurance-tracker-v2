// pages/vendor/[id].js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function VendorPage() {
  const router = useRouter();
  const { id } = router.query;

  const [vendor, setVendor] = useState(null);
  const [org, setOrg] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [compliance, setCompliance] = useState(null);

  const [loadingVendor, setLoadingVendor] = useState(true);
  const [loadingCompliance, setLoadingCompliance] = useState(true);
  const [error, setError] = useState("");

  // Fix Plan State
  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState("");
  const [fixSteps, setFixSteps] = useState([]);
  const [fixSubject, setFixSubject] = useState("");
  const [fixBody, setFixBody] = useState("");
  const [fixInternalNotes, setFixInternalNotes] = useState("");

  // ---------------- LOAD VENDOR & POLICIES ----------------
  useEffect(() => {
    if (!id) return;

    async function loadVendor() {
      try {
        setLoadingVendor(true);

        const res = await fetch(`/api/vendors/${id}`);
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error);

        setVendor(data.vendor);
        setOrg(data.organization);
        setPolicies(data.policies);

        if (data.vendor?.org_id) {
          await loadCompliance(data.vendor.id, data.vendor.org_id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingVendor(false);
      }
    }

    async function loadCompliance(vendorId, orgId) {
      try {
        setLoadingCompliance(true);
        const res = await fetch(
          `/api/requirements/check?vendorId=${vendorId}&orgId=${orgId}`
        );
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);

        setCompliance(data);
      } catch (err) {
        setCompliance({ error: err.message });
      } finally {
        setLoadingCompliance(false);
      }
    }

    loadVendor();
  }, [id]);

  // ---------------- FIX PLAN GENERATOR ----------------
  async function loadFixPlan() {
    if (!vendor || !org) return;

    try {
      setFixLoading(true);
      setFixError("");
      setFixSteps([]);
      setFixSubject("");
      setFixBody("");
      setFixInternalNotes("");

      const res = await fetch(
        `/api/vendor/fix-plan?vendorId=${vendor.id}&orgId=${org.id}`
      );
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      setFixSteps(data.steps);
      setFixSubject(data.vendorEmailSubject);
      setFixBody(data.vendorEmailBody);
      setFixInternalNotes(data.internalNotes);
    } catch (err) {
      setFixError(err.message);
    } finally {
      setFixLoading(false);
    }
  }

  // AUTO RUN FIX PLAN WHEN COMING FROM ALERTS
  useEffect(() => {
    if (router.query.fixPlan === "1" && vendor && org) {
      loadFixPlan();
    }
  }, [router.query, vendor, org]);

  // ---------------- PAGE STATES ----------------
  if (loadingVendor) return <div style={{ padding: 40 }}>Loading vendor…</div>;
  if (error) return <div style={{ padding: 40, color: "red" }}>{error}</div>;
  if (!vendor) return <div style={{ padding: 40 }}>Vendor not found</div>;

  // ---------------- UI ----------------
  return (
    <div style={{ padding: "30px 40px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, fontWeight: 700 }}>{vendor.name}</h1>

      {org && (
        <p style={{ fontSize: 13, color: "#6b7280" }}>
          Organization: <strong>{org.name}</strong>
        </p>
      )}

      {/* ---------------- COMPLIANCE ---------------- */}
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 30
        }}
      >
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Compliance Summary</h2>

        {loadingCompliance && <p>Checking compliance…</p>}
        {compliance?.error && (
          <p style={{ color: "red" }}>❌ {compliance.error}</p>
        )}

        {!loadingCompliance && compliance && !compliance.error && (
          <>
            <p style={{ fontWeight: 600 }}>{compliance.summary}</p>

            {compliance.missing?.length > 0 && (
              <>
                <h4 style={{ color: "#b91c1c" }}>Missing Coverage</h4>
                <ul>
                  {compliance.missing.map((m, i) => (
                    <li key={i}>{m.coverage_type}</li>
                  ))}
                </ul>
              </>
            )}

            {compliance.failing?.length > 0 && (
              <>
                <h4 style={{ color: "#b45309" }}>Failing Requirements</h4>
                <ul>
                  {compliance.failing.map((f, i) => (
                    <li key={i}>
                      {f.coverage_type}: {f.reason}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {compliance.passing?.length > 0 && (
              <>
                <h4 style={{ color: "#15803d" }}>Passing</h4>
                <ul>
                  {compliance.passing.map((p, i) => (
                    <li key={i}>{p.coverage_type}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>

      {/* ---------------- FIX PLAN ---------------- */}
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 30
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: 18 }}>AI Fix Plan</h2>
            <p style={{ color: "#6b7280", fontSize: 13 }}>
              Hybrid G+Legal remediation plan
            </p>
          </div>

          <button
            onClick={loadFixPlan}
            disabled={fixLoading}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              background: "#0f172a",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            {fixLoading ? "Generating…" : "Generate Fix Plan"}
          </button>
        </div>

        {fixError && <p style={{ color: "red" }}>{fixError}</p>}

        {fixSteps.length > 0 && (
          <>
            <h3 style={{ marginTop: 10 }}>Action Steps</h3>
            <ol>
              {fixSteps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </>
        )}

        {fixSubject && (
          <>
            <h3 style={{ marginTop: 15 }}>Vendor Email Subject</h3>
            <p
              style={{
                border: "1px solid #e5e7eb",
                padding: 8,
                borderRadius: 8
              }}
            >
              {fixSubject}
            </p>
          </>
        )}

        {fixBody && (
          <>
            <h3 style={{ marginTop: 15 }}>Vendor Email Body</h3>
            <textarea
              readOnly
              value={fixBody}
              style={{
                width: "100%",
                minHeight: 140,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontFamily: "system-ui"
              }}
            />

            {/* SEND FIX EMAIL */}
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/vendor/send-fix-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      vendorId: vendor.id,
                      orgId: org.id,
                      subject: fixSubject,
                      body: fixBody
                    })
                  });

                  const data = await res.json();
                  if (!data.ok) throw new Error(data.error);

                  alert(`Email sent to ${data.sentTo}`);
                } catch (err) {
                  alert("Email error: " + err.message);
                }
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "#0f172a",
                color: "white",
                width: "100%",
                marginTop: 10,
                fontWeight: 600
              }}
            >
              📬 Send Fix Email
            </button>

            {/* EXPORT PDF */}
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/vendor/fix-plan-pdf", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      vendorName: vendor.name,
                      steps: fixSteps,
                      subject: fixSubject,
                      body: fixBody,
                      internalNotes: fixInternalNotes
                    })
                  });

                  if (!res.ok) throw new Error("PDF failed");

                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);

                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${vendor.name}-Fix-Plan.pdf`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  alert("PDF error: " + err.message);
                }
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "#111827",
                color: "white",
                width: "100%",
                marginTop: 10,
                fontWeight: 600
              }}
            >
              📄 Export Fix Plan PDF
            </button>
          </>
        )}

        {fixInternalNotes && (
          <>
            <h3 style={{ marginTop: 15 }}>Internal Notes</h3>
            <pre>{fixInternalNotes}</pre>
          </>
        )}
      </div>

      {/* ---------------- POLICIES ---------------- */}
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20
        }}
      >
        <h2>Policies</h2>
        {policies.length === 0 && <p>No policies.</p>}
        {policies.map((p) => (
          <div
            key={p.id}
            style={{
              background: "#f9fafb",
              padding: 12,
              borderRadius: 10,
              marginBottom: 10
            }}
          >
            <p><strong>{p.coverage_type}</strong></p>
            <p>Policy #: {p.policy_number || "—"}</p>
            <p>Carrier: {p.carrier || "—"}</p>
            <p>
              Effective: {p.effective_date || "—"} — Expires:{" "}
              {p.expiration_date || "—"}
            </p>
            <p>
              Limits: {p.limit_each_occurrence || "—"} /{" "}
              {p.limit_aggregate || "—"}
            </p>
          </div>
        ))}
      </div>

      <a href="/dashboard" style={{ color: "#2563eb", marginTop: 20 }}>
        ← Back to Dashboard
      </a>
    </div>
  );
}
