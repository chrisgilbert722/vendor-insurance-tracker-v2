// pages/admin/rules-v3/index.js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

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

export default function RuleGroupsIndex() {
  const router = useRouter();
  const { orgId: orgIdQuery } = router.query;

  const [orgId, setOrgId] = useState(orgIdQuery || "");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [newLabel, setNewLabel] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSeverity, setNewSeverity] = useState("medium");

  useEffect(() => {
    if (orgIdQuery) {
      setOrgId(orgIdQuery);
      fetchGroups(orgIdQuery);
    }
  }, [orgIdQuery]);

  async function fetchGroups(orgIdValue) {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/admin/rules-v3/groups?orgId=${orgIdValue}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to load groups");
      setGroups(json.groups || []);
    } catch (err) {
      console.error("[RuleGroupsIndex] load error", err);
      setError(err.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }

  async function handleOrgSubmit(e) {
    e.preventDefault();
    if (!orgId) return;
    router.push(`/admin/rules-v3?orgId=${orgId}`);
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    if (!orgId || !newLabel.trim()) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/rules-v3/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          label: newLabel,
          description: newDescription,
          severity: newSeverity,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to create group");
      setNewLabel("");
      setNewDescription("");
      setNewSeverity("medium");
      fetchGroups(orgId);
    } catch (err) {
      console.error("[RuleGroupsIndex] create error", err);
      setError(err.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: GP.bg,
        color: GP.text,
        padding: "24px 20px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: 24,
            marginBottom: 12,
            background: "linear-gradient(90deg,#38bdf8,#22c55e)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Rule Engine V3 — Rule Groups
        </h1>

        {/* ORG PICKER */}
        <form
          onSubmit={handleOrgSubmit}
          style={{
            marginBottom: 16,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <label style={{ fontSize: 12, color: GP.textSoft }}>Org ID:</label>
          <input
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            placeholder="Enter orgId (e.g. 1)"
            style={{
              padding: "6px 8px",
              borderRadius: 8,
              border: `1px solid ${GP.border}`,
              background: "#020617",
              color: GP.text,
              fontSize: 12,
            }}
          />
          <button
            type="submit"
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid rgba(56,189,248,0.7)",
              background: "linear-gradient(90deg,#38bdf8,#0ea5e9)",
              color: "#0b1120",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Load Groups
          </button>
        </form>

        {loading && (
          <div style={{ fontSize: 13, color: GP.textSoft }}>Loading…</div>
        )}
        {error && (
          <div style={{ fontSize: 13, color: GP.neonRed, marginBottom: 8 }}>
            {error}
          </div>
        )}

        {/* CREATE GROUP */}
        {orgId && (
          <form
            onSubmit={handleCreateGroup}
            style={{
              marginBottom: 20,
              padding: 12,
              borderRadius: 12,
              border: `1px solid ${GP.border}`,
              background: GP.panel,
            }}
          >
            <div
              style={{
                fontSize: 13,
                marginBottom: 6,
                color: GP.textSoft,
              }}
            >
              New Rule Group for Org #{orgId}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Group label"
                style={{
                  flex: "1 1 180px",
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: `1px solid ${GP.border}`,
                  background: "#020617",
                  color: GP.text,
                  fontSize: 12,
                }}
              />
              <input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                style={{
                  flex: "2 1 260px",
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: `1px solid ${GP.border}`,
                  background: "#020617",
                  color: GP.text,
                  fontSize: 12,
                }}
              />
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value)}
                style={{
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: `1px solid ${GP.border}`,
                  background: "#020617",
                  color: GP.text,
                  fontSize: 12,
                }}
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(34,197,94,0.7)",
                  background: "rgba(22,163,74,0.25)",
                  color: GP.neonGreen,
                  fontSize: 12,
                  cursor: loading ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                + Create Group
              </button>
            </div>
          </form>
        )}

        {/* GROUPS LIST */}
        {orgId && groups.length > 0 && (
          <div
            style={{
              borderRadius: 12,
              border: `1px solid ${GP.border}`,
              background: GP.panel,
              padding: 10,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: GP.textSoft,
                marginBottom: 6,
              }}
            >
              {groups.length} group(s) for Org #{orgId}
            </div>
            {groups.map((g) => (
              <div
                key={g.id}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: `1px solid rgba(148,163,184,0.4)`,
                  background: "rgba(15,23,42,0.98)",
                  fontSize: 13,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{g.label}</div>
                  <div style={{ fontSize: 11, color: GP.textSoft }}>
                    {g.description || "No description"}
                  </div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>
                    Severity:{" "}
                    <span style={{ color: GP.neonGold }}>{g.severity}</span> ·{" "}
                    <span style={{ color: g.active ? GP.neonGreen : GP.neonRed }}>
                      {g.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/admin/rules-v3/group/${g.id}?orgId=${g.org_id}`
                    )
                  }
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(56,189,248,0.7)",
                    background: "rgba(15,23,42,0.95)",
                    color: GP.neonBlue,
                    fontSize: 12,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  View Rules →
                </button>
              </div>
            ))}
          </div>
        )}

        {orgId && !loading && groups.length === 0 && (
          <div style={{ fontSize: 13, color: GP.textSoft }}>
            No rule groups yet for this org. Create one above.
          </div>
        )}
      </div>
    </div>
  );
}
