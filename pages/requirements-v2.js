import { useEffect, useState } from "react";
import { useOrg } from "../context/OrgContext";

export default function RequirementsV2() {
  const { activeOrgId, loadingOrgs } = useOrg();
  const orgId = activeOrgId;

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId || loadingOrgs) return;

    async function loadGroups() {
      setLoading(true);
      const res = await fetch(`/api/requirements-v2/groups?orgId=${orgId}`);
      const data = await res.json();
      if (data.ok) setGroups(data.groups);
      setLoading(false);
    }

    loadGroups();
  }, [orgId, loadingOrgs]);


  // Load Rules
  async function loadRulesForGroup(groupId) {
    setSelectedGroup(groupId);
    const res = await fetch(`/api/requirements-v2/rules?groupId=${groupId}`);
    const data = await res.json();
    if (data.ok) setRules(data.rules);
  }

  // Create Group
  async function createGroup() {
    const name = prompt("New Group Name:");
    if (!name) return;

    const res = await fetch(`/api/requirements-v2/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: activeOrgId, name }),
    });

    const data = await res.json();

    if (data.ok) setGroups([...groups, data.group]);
  }

  // Update Rule
  async function updateRule(rule) {
    setSaving(true);

    const res = await fetch(`/api/requirements-v2/rules`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rule),
    });

    const data = await res.json();

    if (data.ok) {
      setRules((prev) => prev.map((r) => (r.id === rule.id ? data.rule : r)));
    }

    setSaving(false);
  }

  // Delete Rule
  async function deleteRule(id) {
    if (!confirm("Delete this rule?")) return;

    await fetch(`/api/requirements-v2/rules?id=${id}`, { method: "DELETE" });

    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading || loadingOrgs)
    return <div style={{ padding: 40 }}>Loading rule groups…</div>;

  return (
    <div style={{ padding: "30px 40px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 20 }}>
        Requirements V2
      </h1>

      <div style={{ display: "flex", gap: 40 }}>
        {/* LEFT COLUMN */}
        <div style={{ width: "260px" }}>
          <h3 style={{ marginBottom: 10 }}>Rule Groups</h3>

          {groups.length === 0 && (
            <p style={{ color: "#6b7280" }}>No groups yet.</p>
          )}

          {groups.map((g) => (
            <div
              key={g.id}
              onClick={() => loadRulesForGroup(g.id)}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                cursor: "pointer",
                background: selectedGroup === g.id ? "#0f172a" : "#f3f4f6",
                color: selectedGroup === g.id ? "white" : "#0f172a",
                marginBottom: 8,
              }}
            >
              {g.name} ({g.rule_count})
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

        {/* RIGHT COLUMN */}
        <div style={{ flex: 1 }}>
          {!selectedGroup ? (
            <p>Select a group.</p>
          ) : (
            <>
              <h3>Rules</h3>

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
                  <input
                    value={rule.field_key}
                    placeholder="Field Key"
                    onChange={(e) =>
                      updateRule({ ...rule, field_key: e.target.value })
                    }
                    style={inputStyle}
                  />

                  <input
                    value={rule.operator}
                    placeholder="Operator"
                    onChange={(e) =>
                      updateRule({ ...rule, operator: e.target.value })
                    }
                    style={inputStyle}
                  />

                  <input
                    value={rule.expected_value}
                    placeholder="Expected Value"
                    onChange={(e) =>
                      updateRule({
                        ...rule,
                        expected_value: e.target.value,
                      })
                    }
                    style={inputStyle}
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
                      marginTop: 8,
                    }}
                  >
                    Delete Rule
                  </button>
                </div>
              ))}

              {saving && <p>Saving…</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 8,
  marginTop: 8,
  border: "1px solid #d1d5db",
  borderRadius: 6,
};
