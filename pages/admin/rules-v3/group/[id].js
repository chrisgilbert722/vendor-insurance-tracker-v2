// pages/admin/rules-v3/group/[id].js
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

export default function RuleGroupDetail() {
  const router = useRouter();
  const { id, orgId } = router.query;

  const [group, setGroup] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/admin/rules-v3/group?id=${id}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to load group");
      setGroup(json.group);
      setRules(json.rules || []);
      setLabel(json.group.label || "");
      setDescription(json.group.description || "");
      setSeverity(json.group.severity || "medium");
      setActive(json.group.active);
    } catch (err) {
      console.error("[RuleGroupDetail] load error", err);
      setError(err.message || "Failed to load group");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveGroup(e) {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      const res = await fetch("/api/admin/rules-v3/group", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          label,
          description,
          severity,
          active,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to save group");
      setGroup(json.group);
    } catch (err) {
      console.error("[RuleGroupDetail] save group error", err);
      setError(err.message || "Failed to save group");
    } finally {
      setSaving(false);
    }
  }

  function handleNewRule() {
    router.push(
      `/admin/rules-v3/rule/new?groupId=${id}${
        orgId ? `&orgId=${orgId}` : ""
      }`
    );
  }

  function handleEditRule(ruleId) {
    router.push(
      `/admin/rules-v3/rule/${ruleId}${
        orgId ? `?orgId=${orgId}` : ""
      }`
    );
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: GP.bg,
          color: GP.textSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
        }}
      >
        Loading rule group…
      </div>
    );
  }

  if (error || !group) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: GP.bg,
          color: GP.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontSize: 14 }}>{error || "Rule group not found"}</div>
        </div>
      </div>
    );
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
        <button
          type="button"
          onClick={() =>
            router.push(
              `/admin/rules-v3${orgId ? `?orgId=${orgId}` : ""}`
            )
          }
          style={{
            marginBottom: 12,
            fontSize: 12,
            color: GP.textSoft,
            border: "none",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          ← Back to Rule Groups
        </button>

        <h1
          style={{
            fontSize: 22,
            marginBottom: 8,
            background: "linear-gradient(90deg,#38bdf8,#a855f7)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Group: {group.label}
        </h1>

        {error && (
          <div
            style={{
              fontSize: 13,
              color: GP.neonRed,
              marginBottom: 8,
            }}
          >
            {error}
          </div>
        )}

        {/* GROUP FORM */}
        <form
          onSubmit={handleSaveGroup}
          style={{
            marginBottom: 18,
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${GP.border}`,
            background: GP.panel,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: GP.textSoft,
              marginBottom: 6,
            }}
          >
            Edit group details
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Group label"
              style={{
                flex: "1 1 200px",
                padding: "6px 8px",
                borderRadius: 8,
                border: `1px solid ${GP.border}`,
                background: "#020617",
                color: GP.text,
                fontSize: 12,
              }}
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
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
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
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
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                color: GP.textSoft,
              }}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Active
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid rgba(34,197,94,0.7)",
              background: "rgba(22,163,74,0.25)",
              color: GP.neonGreen,
              fontSize: 12,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            💾 Save Group
          </button>
        </form>

        {/* RULES LIST */}
        <div
          style={{
            marginBottom: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ fontSize: 16, margin: 0 }}>Rules in this Group</h2>
          <button
            type="button"
            onClick={handleNewRule}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgba(56,189,248,0.7)",
              background: "rgba(15,23,42,0.95)",
              color: GP.neonBlue,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            + New Rule
          </button>
        </div>

        {rules.length === 0 ? (
          <div style={{ fontSize: 13, color: GP.textSoft }}>
            No rules in this group yet.
          </div>
        ) : (
          <div
            style={{
              borderRadius: 12,
              border: `1px solid ${GP.border}`,
              background: GP.panel,
              padding: 10,
            }}
          >
            {rules.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(148,163,184,0.4)",
                  background: "rgba(15,23,42,0.98)",
                  fontSize: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {r.type.toUpperCase()} · {r.field} {r.condition}{" "}
                    {r.value || ""}
                  </div>
                  <div style={{ color: GP.textSoft }}>{r.message}</div>
                  <div style={{ marginTop: 2, fontSize: 11 }}>
                    Severity:{" "}
                    <span style={{ color: GP.neonGold }}>{r.severity}</span>{" "}
                    ·{" "}
                    <span style={{ color: r.active ? GP.neonGreen : GP.neonRed }}>
                      {r.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleEditRule(r.id)}
                  style={{
                    padding: "5px 9px",
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.6)",
                    background: "rgba(15,23,42,0.9)",
                    color: GP.textSoft,
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  Edit →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
