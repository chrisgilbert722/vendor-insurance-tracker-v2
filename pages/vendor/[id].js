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

  // FIX PLAN STATE
  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState("");
  const [fixSteps, setFixSteps] = useState([]);
  const [fixSubject, setFixSubject] = useState("");
  const [fixBody, setFixBody] = useState("");
  const [fixInternalNotes, setFixInternalNotes] = useState("");

  // SEND FIX EMAIL STATE
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");

  // ----------------- LOAD VENDOR -----------------
  useEffect(() => {
    if (!id) return;

    async function loadVendor() {
      try {
        setLoadingVendor(true);

        const res = await fetch(`/api/vendors/${id}`);
        const data = await res.json();

        if (!data.ok) throw new Error(data.error);

        setVendor(data.vendor);
        setOrg(data.organization);
        setPolicies(data.policies);

        if (data.vendor?.org_id) {
          await loadCompliance(data.vendor.id, data.vendor.org_id);
        } else {
          setLoadingCompliance(false);
        }
      } catch (err) {
        setError(err.message);
        setLoadingCompliance(false);
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

  // ----------------- LOAD FIX PLAN -----------------
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

      setFixSteps(data.steps || []);
      setFixSubject(data.vendorEmailSubject || "");
      setFixBody(data.vendorEmailBody || "");
      setFixInternalNotes(data.internalNotes || "");
    } catch (err) {
      setFixError(err.message);
    } finally {
      setFixLoading(false);
    }
  }

  // ----------------- AUTO-RUN FIX PLAN -----------------
  useEffect(() => {
    if (router.query.fixPlan === "1" && vendor && org) {
      loadFixPlan();
    }
  }, [router.query, vendor, org]);

  // ----------------- SEND FIX EMAIL -----------------
  async function sendFixEmail() {
    if (!vendor || !org || !fixSubject || !fixBody) return;

    try {
      setSendLoading(true);
      setSendError("");
      setSendSuccess("");

      const res = await fetch("/api/vendor/send-fix-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: vendor.id,
          orgId: org.id,
          subject: fixSubject,
          body: fixBody,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      setSendSuccess(`Email sent to ${data.sentTo}`);
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSendLoading(false);
    }
  }

  // ----------------- UI STATES -----------------
  if (loadingVendor) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Loading vendor…</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Error</h1>
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Vendor not found</h1>
      </div>
    );
  }

  // ----------------- MAIN UI -----------------
  return (
    <div style={{ padding: "30px 40px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>
        {vendor.name}
      </h1>

      {org && (
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
          Organization: <strong>{org.name}</strong>
        </p>
      )}

      {/* ----------------- COMPLIANCE SUMMARY ----------------- */}
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 30,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Compliance Summary</h2>

        {loadingCompliance && <p>Checking compliance…</p>}

        {compliance?.error && (
          <p style={{ color: "red" }}>❌ {compliance.error}</p>
        )}

        {!loadingCompliance && compliance && !compliance.error && (
          <>
            <p style={{ marginTop: 8, fontWeight: 600 }}>{compliance.summary}</p>

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

      {/* ----------------- FIX PLAN PANEL ----------------- */}
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 30,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>AI Fix Plan</h2>
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              Hybrid G+Legal vendor remediation steps.
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
              fontWeight: 600,
            }}
          >
            {fixLoading ? "Generating…" : "Generate Fix Plan"}
          </button>
        </div>

        {fixError && (
          <p style={{ color: "red", marginBottom: 12 }}>{fixError}</p>
        )}

        {fixSteps.length > 0 && (
          <>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Action Steps</h3>
            <ol style={{ paddingLeft: 20, marginBottom: 12 }}>
              {fixSteps.map((s, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  {s}
                </li>
              ))}
            </ol>
          </>
        )}

        {fixSubject && (
          <>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Vendor Email Subject</h3>
            <p
              style={{
                background: "#f9fafb",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            >
              {fixSubject}
            </p>
          </>
        )}

        {fixBody && (
          <>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>
              Vendor Email Body
            </h3>

            <textarea
              readOnly
              value={fixBody}
              style={{
                width: "100%",
                minHeight: 140,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontFamily: "system-ui",
                whiteSpace: "pre-wrap",
              }}
            />

            {/* ---------------- SEND FIX EMAIL BUTTON ---------------- */}
            <button
              onClick={sendFixEmail}
              disabled={sendLoading}
              style={{
                width: "100%",
                marginTop: 15,
                padding: "10px 14px",
                borderRadius: 8,
                background: "#0f172a",
                color: "white",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              {sendLoading ? "Sending…" : "📬 Send Fix Email"}
            </button>

            {sendError && (
              <p style={{ color: "red", marginTop: 8 }}>{sendError}</p>
            )}

            {sendSuccess && (
              <p style={{ color: "#15803d", marginTop: 8 }}>{sendSuccess}</p>
            )}
          </>
        )}

        {fixInternalNotes && (
          <>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 20 }}>
              Internal Notes
            </h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{fixInternalNotes}</p>
          </>
        )}
      </div>

      {/* ----------------- POLICIES ----------------- */}
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 30,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Policies</h2>

        {policies.length === 0 && <p>No policies on file.</p>}

        {policies.map((p) => (
          <div
            key={p.id}
            style={{
              padding: 12,
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              marginTop: 10,
            }}
          >
            <p style={{ fontWeight: 600 }}>{p.coverage_type}</p>
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

      <a href="/dashboard" style={{ fontSize: 14, color: "#2563eb" }}>
        ← Back to Dashboard
      </a>
    </div>
  );
}
