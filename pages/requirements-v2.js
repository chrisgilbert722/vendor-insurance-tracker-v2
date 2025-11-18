import { useEffect, useState } from "react";

export default function RequirementsV2() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState(null);

  // Load organization ID from context/api
  useEffect(() => {
    async function loadOrg() {
      const res = await fetch("/api/org/me");
      const data = await res.json();
      if (data.ok) setOrgId(data.org.id);
    }
    loadOrg();
  }, []);

  // Load all rule groups
  useEffect(() => {
    if (!orgId) return;

    async function loadGroups() {
      setLoading(true);
      const res = await fetch(`/api/requirements-v2?orgId=${orgId}`);
      const data = await res.json();
      if (data.ok) setGroups(data.groups);
      setLoading(false);
    }
    loadGroups();
  }, [orgId]);

  // Load rules for selected group
  async function loadRules(groupId) {
    setSelectedGroup(groupId);
    const res = await fetch(`/api/requirements-v2/${groupId}`);
    const data = await res.json();
    if (data.ok) setRules(data.rules);
  }

  // Create new group
  async function createGroup() {
    const name = prompt("New Group Name");
    if (!name) return;
    const res = await fetch(`/api/requirements-v2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, org_id: orgId }),
    });
    const data = await res.json();
    if (data.ok) setGroups([...groups, data.group]);
  }

  // Update a rule inline
  async function updateRule(rule) {
    setSaving(true);
    const res = await fetch(`/api/requirements-v2/${rule.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rule),
    });
    await res.json();
    setSaving(false);
  }

  // Delete a rule
  async function deleteRule(id) {
    if (!confirm("Delete this rule?")) return;
    await fetch(`/api/requirements-v2/${id}`, { method: "DELETE" });
    setRules(rules.filter((r) => r.id !== id));
  }

  if (loading) return <div style={{ padding: 40 }}>Loading rule groups…</div>;

  return (
    <div style={{ padding: "30px 40px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 20 }}>
        Requirements V2
      </h1>

      <div style={{ display: "flex", gap: 40 }}>
        {/* LEFT COLUMN — GROUPS */}
        <div style={{ width: "260px" }}>
          <h3 style={{ marginBottom: 10 }}>Rule Groups</h3>

          {groups.map((g) => (
            <div
              key={g.id}
              onClick={() => loadRules(g.id)}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                cursor: "pointer",
                background:
                  selectedGroup === g.id ? "#0f172a" : "#f3f4f6",
                color: selectedGroup === g.id ? "white" : "#0f172a",
                marginBottom: 8,
              }}
            >
              {g.name}
            </div>
          ))}

          <button
            onClick={createGroup}
            style={{
              marginTop: 12,
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              background: "#2563eb",
              color: "white",
              border: 0,
              cursor: "pointer",
            }}
          >
            + New Group
          </button>
        </div>

        {/* RIGHT COLUMN — RULES */}
        <div style={{ flex: 1 }}>
          {selectedGroup ? (
            <>
              <h3>Rules in Group</h3>

              {rules.length === 0 && (
                <p style={{ color: "#6b7280" }}>No rules yet.</p>
              )}

              {rules.map((rule) => (
                <div
                  key={rule.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: 15,
                    borderRadius: 10,
                    marginBottom: 12,
                    background: "white",
                  }}
                >
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      value={rule.coverage_type}
                      onChange={(e) =>
                        updateRule({
                          ...rule,
                          coverage_type: e.target.value,
                        })
                      }
                      style={{
                        flex: 1,
                        padding: 8,
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                      }}
                    />

                    <button
                      onClick={() => deleteRule(rule.id)}
                      style={{
                        background: "#b91c1c",
                        color: "white",
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: 0,
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>

                  {/* LIMITS */}
                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <input
                      type="number"
                      placeholder="Each Occurrence"
                      value={rule.min_limit_each_occurrence || ""}
                      onChange={(e) =>
                        updateRule({
                          ...rule,
                          min_limit_each_occurrence: Number(e.target.value),
                        })
                      }
                      style={inputStyle}
                    />

                    <input
                      type="number"
                      placeholder="Aggregate Limit"
                      value={rule.min_limit_aggregate || ""}
                      onChange={(e) =>
                        updateRule({
                          ...rule,
                          min_limit_aggregate: Number(e.target.value),
                        })
                      }
                      style={inputStyle}
                    />

                    <input
                      type="number"
                      placeholder="Min Risk Score"
                      value={rule.min_risk_score || ""}
                      onChange={(e) =>
                        updateRule({
                          ...rule,
                          min_risk_score: Number(e.target.value),
                        })
                      }
                      style={inputStyle}
                    />
                  </div>

                  {/* TOGGLES */}
                  <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={rule.require_additional_insured}
                        onChange={(e) =>
                          updateRule({
                            ...rule,
                            require_additional_insured: e.target.checked,
                          })
                        }
                      />{" "}
                      Additional Insured
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={rule.require_waiver}
                        onChange={(e) =>
                          updateRule({
                            ...rule,
                            require_waiver: e.target.checked,
                          })
                        }
                      />{" "}
                      Waiver Required
                    </label>
                  </div>

                  {/* NOTES */}
                  <textarea
                    placeholder="Internal notes"
                    value={rule.notes || ""}
                    onChange={(e) =>
                      updateRule({
                        ...rule,
                        notes: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      marginTop: 12,
                      padding: 10,
                      minHeight: 60,
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                    }}
                  />
                </div>
              ))}

              {saving && <p>Saving…</p>}
            </>
          ) : (
            <p>Select a group.</p>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  flex: 1,
  padding: 8,
  border: "1px solid #d1d5db",
  borderRadius: 6,
};
