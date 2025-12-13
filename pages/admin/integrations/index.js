// pages/admin/integrations/index.js
// ============================================================
// Enterprise Integrations Control Panel
// Surface area for API + Webhooks (Enterprise Armor)
// ============================================================

import { useEffect, useState } from "react";
import { useOrg } from "../../../context/OrgContext";

export default function IntegrationsPage() {
  const { activeOrgId } = useOrg();
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState([]);
  const [hooks, setHooks] = useState([]);

  useEffect(() => {
    if (!activeOrgId) return;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/integrations?orgId=${encodeURIComponent(activeOrgId)}`
        );
        const json = await res.json();
        if (json.ok) {
          setKeys(json.keys || []);
          setHooks(json.webhooks || []);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [activeOrgId]);

  return (
    <div
      style={{
        padding: 32,
        minHeight: "100vh",
        background: "#020617",
        color: "#e5e7eb",
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Integrations</h1>
      <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 24 }}>
        Connect your compliance data to external systems securely.
      </p>

      {/* API KEYS */}
      <section style={section}>
        <h2 style={h2}>API Keys</h2>
        <p style={desc}>
          Use API keys to access read-only compliance data from your systems.
        </p>

        {loading ? (
          <div>Loading…</div>
        ) : keys.length === 0 ? (
          <div style={empty}>
            No API keys yet. Create one to enable integrations.
          </div>
        ) : (
          <ul>
            {keys.map((k) => (
              <li key={k.id} style={row}>
                <span>{k.name || "API Key"}</span>
                <span style={{ color: "#9ca3af" }}>
                  Created {new Date(k.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* WEBHOOKS */}
      <section style={section}>
        <h2 style={h2}>Webhooks</h2>
        <p style={desc}>
          Receive real-time compliance events in your systems.
        </p>

        {loading ? (
          <div>Loading…</div>
        ) : hooks.length === 0 ? (
          <div style={empty}>
            No webhooks configured. Add one to receive events.
          </div>
        ) : (
          <ul>
            {hooks.map((w) => (
              <li key={w.id} style={row}>
                <span>{w.url}</span>
                <span style={{ color: w.enabled ? "#22c55e" : "#f87171" }}>
                  {w.enabled ? "Active" : "Disabled"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const section = {
  border: "1px solid rgba(51,65,85,0.9)",
  borderRadius: 18,
  padding: 18,
  marginBottom: 24,
  background: "rgba(15,23,42,0.98)",
};

const h2 = {
  fontSize: 18,
  marginBottom: 6,
};

const desc = {
  fontSize: 12,
  color: "#9ca3af",
  marginBottom: 12,
};

const empty = {
  padding: 14,
  borderRadius: 12,
  background: "rgba(15,23,42,0.85)",
  border: "1px dashed rgba(148,163,184,0.4)",
  fontSize: 13,
  color: "#9ca3af",
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  padding: "10px 0",
  borderBottom: "1px solid rgba(51,65,85,0.6)",
};
