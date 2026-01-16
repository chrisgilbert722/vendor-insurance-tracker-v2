// ============================================================
// VENDOR COMMAND CENTER — V4 (IRON MAN)
// - Neon ONLY (via API)
// - INTEGER vendor IDs
// - Request COI wired to alerts-v2 pipeline
// ============================================================

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useOrg } from "../../context/OrgContext";

/* -----------------------------
   Safe helpers
----------------------------- */
const safeString = (v, f = "—") =>
  typeof v === "string" && v.length ? v : f;

const safeNumber = (v, f = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : f;

/* -----------------------------
   Page
----------------------------- */
export default function VendorCommandCenter() {
  const router = useRouter();
  const { id } = router.query; // INTEGER
  const { activeOrgId } = useOrg();

  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [sendingCOI, setSendingCOI] = useState(false);
  const [coiMessage, setCoiMessage] = useState("");

  useEffect(() => {
    if (!id || !activeOrgId) return;

    const vendorId = Number(id);
    if (!Number.isInteger(vendorId)) {
      router.replace("/vendors");
      return;
    }

    let cancelled = false;

    async function loadVendor() {
      try {
        const res = await fetch(
          `/api/vendors/${vendorId}?orgId=${activeOrgId}`
        );
        const json = await res.json();

        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Failed to load vendor");
        }

        if (!cancelled) setVendor(json.vendor);
      } catch (err) {
        if (!cancelled) setError("Failed to load vendor.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadVendor();
    return () => (cancelled = true);
  }, [id, activeOrgId, router]);

  /* -----------------------------
     REQUEST COI (CORRECT PIPELINE)
  ----------------------------- */
  async function handleRequestCOI() {
    if (!vendor || sendingCOI) return;

    setSendingCOI(true);
    setCoiMessage("");

    try {
      const res = await fetch("/api/alerts-v2/request-coi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: vendor.id,
          orgId: activeOrgId,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to request COI");
      }

      setCoiMessage("✅ COI request sent and alert created.");
    } catch (err) {
      setCoiMessage(`❌ ${err.message}`);
    } finally {
      setSendingCOI(false);
    }
  }

  if (loading) return <PageShell>Loading vendor…</PageShell>;
  if (error || !vendor) return <PageShell>{error}</PageShell>;

  const status = vendor.status || vendor.computedStatus || "unknown";

  return (
    <PageShell>
      <div style={header}>
        <div>
          <div style={eyebrow}>Vendor Command Center</div>
          <h1 style={title}>{safeString(vendor.name)}</h1>
          <div style={statusRow(status)}>
            STATUS: {status.toUpperCase()}
          </div>

          {coiMessage && (
            <div style={{ marginTop: 6, fontSize: 12 }}>{coiMessage}</div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <ActionButton
            label="Upload COI"
            tone="blue"
            onClick={() =>
              router.push(`/upload-coi?vendorId=${vendor.id}`)
            }
          />

          <ActionButton
            label={sendingCOI ? "Sending…" : "Request COI"}
            tone="green"
            disabled={sendingCOI}
            onClick={handleRequestCOI}
          />

          <ActionButton
            label="Flag Vendor"
            tone="red"
            onClick={() => alert("Flag Vendor — next")}
          />
        </div>
      </div>

      <Grid>
        <Panel title="Compliance Snapshot">
          <Metric label="AI Score" value={safeNumber(vendor.aiScore)} />
          <Metric label="Alerts" value={safeNumber(vendor.alertsCount)} />
          <Metric label="Status" value={status.toUpperCase()} />
        </Panel>

        <Panel title="Policies">
          <EmptySafe text="No policies on file." />
        </Panel>

        <Panel title="Certificates (COIs)">
          <EmptySafe text="No COIs uploaded yet." />
        </Panel>

        <Panel title="Renewals">
          <EmptySafe text="No upcoming renewals." />
        </Panel>

        <Panel title="Alerts">
          <EmptySafe text="No active alerts." />
        </Panel>

        <Panel title="Activity Timeline">
          <EmptySafe text="No activity recorded." />
        </Panel>
      </Grid>
    </PageShell>
  );
}

/* ---------------- UI components ---------------- */

function PageShell({ children }) {
  return (
    <div style={shell}>
      <div style={aura} />
      <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
    </div>
  );
}

function Grid({ children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16, marginTop: 20 }}>
      {children}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div style={panel}>
      <div style={panelTitle}>{title}</div>
      {children}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <div style={metricLabel}>{label}</div>
      <div style={metricValue}>{value}</div>
    </div>
  );
}

function EmptySafe({ text }) {
  return <div style={empty}>{text}</div>;
}

function ActionButton({ label, tone, onClick, disabled }) {
  const colors = { blue: "#38bdf8", green: "#22c55e", red: "#fb7185" };
  const c = colors[tone];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: `1px solid ${c}`,
        background: `radial-gradient(circle at top,${c},#020617)`,
        color: "#e5e7eb",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}

/* ---------------- styles ---------------- */

const shell = {
  minHeight: "100vh",
  padding: "28px 36px",
  background: "radial-gradient(circle at top left,#020617,#000)",
  color: "#e5e7eb",
  position: "relative",
};

const aura = {
  position: "absolute",
  top: -260,
  left: "50%",
  transform: "translateX(-50%)",
  width: 1100,
  height: 1100,
  background: "radial-gradient(circle,rgba(59,130,246,0.35),transparent 60%)",
  filter: "blur(130px)",
};

const header = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const eyebrow = { fontSize: 11, letterSpacing: 1.4, color: "#94a3b8", textTransform: "uppercase" };
const title = { fontSize: 26, fontWeight: 600 };
const statusRow = (s) => ({ fontSize: 12, fontWeight: 700, color: s === "active" ? "#22c55e" : s === "expired" ? "#fb7185" : "#facc15" });
const panel = { borderRadius: 20, padding: 14, background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.4)" };
const panelTitle = { fontSize: 12, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", color: "#94a3b8" };
const metricLabel = { fontSize: 11, color: "#9ca3af" };
const metricValue = { fontSize: 20, fontWeight: 700 };
const empty = { fontSize: 12, color: "#6b7280" };
