// pages/admin/requirements-v3.js
// REQUIREMENTS ENGINE V3 — FULL COCKPIT UI + API INTEGRATION

import { useEffect, useState, useMemo } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

const FIELD_OPTIONS = [
  { key: "policy.coverage_type", label: "Coverage Type" },
  { key: "policy.glEachOccurrence", label: "GL Each Occurrence" },
  { key: "policy.glAggregate", label: "GL Aggregate" },
  { key: "policy.expiration_date", label: "Expiration Date" },
  { key: "policy.carrier", label: "Carrier Name" },
];

const OPERATOR_OPTIONS = [
  { key: "equals", label: "Equals" },
  { key: "not_equals", label: "Not Equals" },
  { key: "gte", label: "≥ Greater or Equal" },
  { key: "lte", label: "≤ Less or Equal" },
  { key: "contains", label: "Contains" },
];

const SEVERITY_COLORS = {
  critical: "#ff4d6d",
  high: "#ffa600",
  medium: "#f8c300",
  low: "#22c55e",
};

export default function RequirementsV3Page() {
  const { isAdmin, isManager } = useRole();
  const { activeOrgId: orgId, loadingOrgs } = useOrg();
  const canEdit = isAdmin || isManager;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [rules, setRules] = useState([]);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success",
  });

  const [samplePolicyText, setSamplePolicyText] = useState(
`{
  "policy.coverage_type": "General Liability",
  "policy.glEachOccurrence": 1000000,
  "policy.glAggregate": 2000000,
  "policy.expiration_date": "2025-12-31",
  "policy.carrier": "Sample Carrier"
}`
  );

  const [evaluation, setEvaluation] = useState({
    ok: false,
    error: "",
    results: {},
  });

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) || null,
    [groups, activeGroupId]
  );

  // --------------------------
  // LOAD GROUPS
  // --------------------------
  useEffect(() => {
    if (loadingOrgs) return;
    if (!orgId) {
      setLoading(false);
      return;
    }
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, loadingOrgs]);

  async function loadGroups() {
    setLoading(true);
    try {
      const res = await fetch(`/api/requirements-v2/groups?orgId=${orgId}`);
      const json = await res.json();

      if (!json.ok) throw new Error(json.error || "Failed to load groups");

      const list = json.groups || [];
      setGroups(list);

      if (list.length > 0) {
        setActiveGroupId(list[0].id);
        await loadRulesForGroup(list[0].id);
      } else {
        setActiveGroupId(null);
        setRules([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load groups.");
    } finally {
      setLoading(false);
    }
  }

  // --------------------------
  // LOAD RULES
  // --------------------------
  async function loadRulesForGroup(groupId) {
    if (!groupId) {
      setRules([]);
      setEvaluation({ ok: false, error: "", results: {} });
      return;
    }

    try {
      const res = await fetch(`/api/requirements-v2/rules?groupId=${groupId}`);
      const json = await res.json();

      if (!json.ok) throw new Error(json.error || "Failed to load rules");

      setRules(json.rules || []);
      setEvaluation({ ok: false, error: "", results: {} });
    } catch (err) {
      setError(err.message || "Failed to load rules.");
    }
  }

  // --------------------------
  // GROUP CRUD
  // --------------------------
  async function handleCreateGroup() {
    if (!canEdit || !orgId) return;

    const name = prompt("New group name:");
    if (!name) return;

    try {
      setSaving(true);
      const res = await fetch("/api/requirements-v2/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, name }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Group creation failed");

      setGroups((prev) => [json.group, ...prev]);
      setActiveGroupId(json.group.id);
      setRules([]);
      setToast({ open: true, type: "success", message: "Group created." });
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateGroup(patch) {
    if (!canEdit || !activeGroup) return;

    const updated = { ...activeGroup, ...patch };
    setGroups((prev) => prev.map((g) => (g.id === activeGroup.id ? updated : g)));

    try {
      setSaving(true);
      const res = await fetch("/api/requirements-v2/groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Group update failed");

      setToast({ open: true, type: "success", message: "Group updated." });
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGroup(id) {
    if (!canEdit || !id) return;
    if (!window.confirm("Delete group & all rules?")) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/requirements-v2/groups?id=${id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Delete failed");

      const remaining = groups.filter((g) => g.id !== id);
      setGroups(remaining);

      if (remaining.length > 0) {
        setActiveGroupId(remaining[0].id);
        await loadRulesForGroup(remaining[0].id);
      } else {
        setActiveGroupId(null);
        setRules([]);
      }

      setToast({ open: true, type: "success", message: "Group deleted." });
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  // --------------------------
  // RULE CRUD
  // --------------------------
  async function handleCreateRule() {
    if (!activeGroup || !canEdit) return;

    const field_key = prompt("Field key (e.g. policy.coverage_type):");
    if (!field_key) return;
    const expected_value = prompt("Expected value:");
    if (!expected_value) return;

    try {
      setSaving(true);
      const res = await fetch("/api/requirements-v2/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: activeGroup.id,
          field_key,
          operator: "equals",
          expected_value,
          severity: "medium",
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to create rule");

      setRules((prev) => [...prev, json.rule]);
      setToast({ open: true, type: "success", message: "Rule created." });
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateRule(ruleId, patch) {
    if (!ruleId || !canEdit) return;

    const updated = { ...rules.find((r) => r.id === ruleId), ...patch };
    setRules((prev) => prev.map((r) => (r.id === ruleId ? updated : r)));

    try {
      setSaving(true);
      const res = await fetch("/api/requirements-v2/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to update rule");

      setToast({ open: true, type: "success", message: "Rule updated." });
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRule(ruleId) {
    if (!ruleId || !canEdit) return;
    if (!window.confirm("Delete this rule?")) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/requirements-v2/rules?id=${ruleId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to delete rule");

      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      setToast({ open: true, type: "success", message: "Rule deleted." });
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  // --------------------------
  // ENGINE + SAMPLE EVAL
  // --------------------------
  async function handleRunEngine() {
    try {
      setSaving(true);
      const res = await fetch("/api/engine/run-v3", { method: "POST" });
      const json = await res.json();

      if (!json.ok) throw new Error(json.error || "Engine run failed");

      setToast({
        open: true,
        type: "success",
        message: json.message || "Engine run completed.",
      });
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        message: err.message || "Engine failed.",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleEvaluateSamplePolicy() {
    setEvaluation({ ok: false, error: "", results: {} });

    let parsed;
    try {
      parsed = JSON.parse(samplePolicyText || "{}");
    } catch {
      return setToast({
        open: true,
        type: "error",
        message: "Invalid policy JSON.",
      });
    }

    const results = {};
    for (const r of rules) results[r.id] = evaluateRule(r, parsed);

    setEvaluation({ ok: true, error: "", results });
    setToast({ open: true, type: "success", message: "Sample evaluated." });
  }
  // --------------------------
  // RENDER — COCKPIT UI
  // --------------------------
  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(circle at 20% 10%, #020617 0%, #020617 45%, #000 100%)",
        padding: "40px 40px 50px",
        color: "#e5e7eb",
        overflow: "hidden",
        fontFamily:
          '-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif',
      }}
    >
      {/* SCANLINES */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "100% 3px",
          opacity: 0.3,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* AURA GLOW */}
      <div
        style={{
          position: "absolute",
          top: -120,
          left: "50%",
          transform: "translateX(-50%)",
          width: 900,
          height: 900,
          background:
            "radial-gradient(circle, rgba(59,130,246,0.28), transparent 60%)",
          filter: "blur(120px)",
          opacity: 0.9,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* HEADER */}
      <div style={{ position: "relative", zIndex: 2, marginBottom: 22 }}>
        <div
          style={{
            display: "inline-flex",
            gap: 8,
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.5)",
            background:
              "linear-gradient(120deg,rgba(15,23,42,0.96),rgba(15,23,42,0.7))",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "#9ca3af",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Requirements Engine V3
          </span>
          <span
            style={{
              fontSize: 10,
              color: "#38bdf8",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            Coverage • Limits • Endorsements
          </span>
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: 0.3,
          }}
        >
          Define{" "}
          <span
            style={{
              background:
                "linear-gradient(90deg,#38bdf8,#a5b4fc,#e5e7eb)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            coverage rules
          </span>{" "}
          that power alerts automatically.
        </h1>

        <p
          style={{
            marginTop: 6,
            fontSize: 13,
            color: "#cbd5f5",
            maxWidth: 720,
          }}
        >
          Every rule here is evaluated against vendor policies and updates the
          Alerts Cockpit in real time. This is your AI coverage engine for
          limits, endorsements, and policy health.
        </p>

        <div
          style={{
            marginTop: 4,
            fontSize: 12,
            color: "#64748b",
          }}
        >
          Org:{" "}
          <span style={{ color: "#e5e7eb" }}>{orgId || "none loaded"}</span> ·
          Groups:{" "}
          <span style={{ color: "#e5e7eb" }}>{groups.length}</span> · Active:{" "}
          <span style={{ color: "#e5e7eb" }}>
            {activeGroup ? activeGroup.name : "none"}
          </span>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div
          style={{
            position: "relative",
            zIndex: 2,
            marginBottom: 16,
            padding: "10px 12px",
            borderRadius: 12,
            background: "rgba(127,29,29,0.96)",
            border: "1px solid rgba(248,113,113,0.85)",
            color: "#fee2e2",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* MAIN GRID */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "260px minmax(0,1.7fr) minmax(0,1.3fr)",
          gap: 18,
          alignItems: "flex-start",
        }}
      >
        {/* LEFT COLUMN — GROUPS PANEL */}
        <GroupsPanel
          groups={groups}
          activeGroupId={activeGroupId}
          loading={loading}
          canEdit={canEdit}
          onCreate={handleCreateGroup}
          onSelect={(id) => {
            setActiveGroupId(id);
            loadRulesForGroup(id);
          }}
          onUpdate={handleUpdateGroup}
          onDelete={handleDeleteGroup}
          activeGroup={activeGroup}
        />
        {/* MIDDLE COLUMN — RULES EDITOR */}
        <RulesPanel
          rules={rules}
          canEdit={canEdit}
          activeGroup={activeGroup}
          onCreate={handleCreateRule}
          onUpdate={handleUpdateRule}
          onDelete={handleDeleteRule}
        />

        {/* RIGHT COLUMN — LIVE PREVIEW + SAMPLE POLICY */}
        <RightPreviewPanel
          rules={rules}
          samplePolicyText={samplePolicyText}
          setSamplePolicyText={setSamplePolicyText}
          evaluation={evaluation}
          onRunEngine={handleRunEngine}
          onEvaluate={handleEvaluateSamplePolicy}
          saving={saving}
        />
      </div>

      {/* TOAST */}
      <ToastV2
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() =>
          setToast((p) => ({
            ...p,
            open: false,
          }))
        }
      />
    </div>
  );
}

/* ===========================
   GROUPS PANEL
   =========================== */

function GroupsPanel({
  groups,
  activeGroupId,
  loading,
  canEdit,
  onCreate,
  onSelect,
  onUpdate,
  onDelete,
  activeGroup,
}) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 24,
        padding: 16,
        background:
          "linear-gradient(145deg, rgba(11,20,40,0.97), rgba(6,12,26,0.94))",
        border: "1px solid rgba(88,116,255,0.45)",
        boxShadow:
          "0 26px 70px rgba(15,23,42,0.98), 0 0 50px rgba(59,130,246,0.25)",
        overflow: "hidden",
      }}
    >
      {/* Glow strip */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: -40,
          right: -40,
          height: 3,
          background:
            "linear-gradient(90deg, transparent, rgba(59,130,246,0.9), rgba(129,140,248,0.85), transparent)",
          opacity: 0.9,
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: "#9ca3af",
            }}
          >
            Groups
          </div>
          <div style={{ fontSize: 12, color: "#e5e7eb", opacity: 0.8 }}>
            Organize lanes of related coverage rules.
          </div>
        </div>

        <button
          onClick={onCreate}
          disabled={!canEdit}
          style={{
            borderRadius: 999,
            padding: "7px 14px",
            border: "1px solid rgba(56,189,248,0.9)",
            background:
              "radial-gradient(circle at top left,#38bdf8,#0ea5e9,#020617)",
            color: "#e0f2fe",
            fontSize: 12,
            cursor: canEdit ? "pointer" : "not-allowed",
            opacity: canEdit ? 1 : 0.5,
            boxShadow: "0 0 18px rgba(56,189,248,0.55)",
          }}
        >
          + New Group
        </button>
      </div>

      <div
        style={{
          fontSize: 11,
          color: "#64748b",
          marginBottom: 8,
        }}
      >
        {loading
          ? "Loading groups…"
          : groups.length === 0
          ? "No groups yet. Create your first lane."
          : `${groups.length} group${groups.length === 1 ? "" : "s"} loaded.`}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxHeight: 420,
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        {groups.map((g) => {
          const isActive = g.id === activeGroupId;
          return (
            <button
              key={g.id}
              onClick={() => onSelect(g.id)}
              style={{
                textAlign: "left",
                borderRadius: 16,
                padding: "9px 10px",
                border: isActive
                  ? "1px solid rgba(59,130,246,0.95)"
                  : "1px solid rgba(51,65,85,0.9)",
                background: isActive
                  ? "radial-gradient(circle at top left,rgba(59,130,246,0.35),rgba(15,23,42,0.98))"
                  : "rgba(15,23,42,0.96)",
                boxShadow: isActive
                  ? "0 0 18px rgba(59,130,246,0.6)"
                  : "none",
                color: "#e5e7eb",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 2,
                }}
              >
                {g.name || "Untitled group"}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                }}
              >
                {g.description || "No description yet."}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#64748b",
                  marginTop: 3,
                }}
              >
                {g.rule_count ?? 0} rule{(g.rule_count ?? 0) === 1 ? "" : "s"}
              </div>
            </button>
          );
        })}

        {!loading && groups.length === 0 && (
          <div
            style={{
              borderRadius: 14,
              padding: "10px 10px",
              border: "1px dashed rgba(148,163,184,0.8)",
              fontSize: 12,
              color: "#9ca3af",
            }}
          >
            Click <span style={{ color: "#e5e7eb" }}>+ New Group</span> to
            start defining your coverage lanes.
          </div>
        )}
      </div>

      {/* Small active group quick controls */}
      {activeGroup && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid rgba(30,64,175,0.7)",
            fontSize: 11,
            color: "#9ca3af",
          }}
        >
          <div style={{ marginBottom: 4 }}>Active lane: {activeGroup.name}</div>
          <button
            onClick={() =>
              onUpdate({ is_active: !(activeGroup.is_active ?? true) })
            }
            style={{
              borderRadius: 999,
              padding: "4px 9px",
              border: "1px solid rgba(148,163,184,0.85)",
              background: "rgba(15,23,42,0.96)",
              color: "#e5e7eb",
              fontSize: 11,
              marginRight: 6,
            }}
          >
            {activeGroup.is_active ?? true ? "Disable lane" : "Enable lane"}
          </button>
          <button
            onClick={() => onDelete(activeGroup.id)}
            style={{
              borderRadius: 999,
              padding: "4px 9px",
              border: "1px solid rgba(248,113,113,0.9)",
              background:
                "linear-gradient(120deg,rgba(127,29,29,0.95),rgba(76,5,5,0.9))",
              color: "#fecaca",
              fontSize: 11,
            }}
          >
            Delete lane
          </button>
        </div>
      )}
    </div>
  );
}

/* ===========================
   RULES PANEL
   =========================== */

function RulesPanel({
  rules,
  canEdit,
  activeGroup,
  onCreate,
  onUpdate,
  onDelete,
}) {
  return (
    <div
      style={{
        borderRadius: 24,
        padding: 16,
        background:
          "linear-gradient(135deg, rgba(12,22,45,0.98), rgba(8,15,32,0.96))",
        border: "1px solid rgba(88,116,255,0.45)",
        boxShadow:
          "0 26px 70px rgba(15,23,42,0.98), 0 0 40px rgba(129,140,248,0.25)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: "#9ca3af",
            }}
          >
            Rules
          </div>
          <div style={{ fontSize: 12, color: "#e5e7eb", opacity: 0.8 }}>
            {activeGroup
              ? `Editing rules in lane “${activeGroup.name}”.`
              : "Select a lane on the left to edit rules."}
          </div>
        </div>

        <button
          onClick={onCreate}
          disabled={!canEdit || !activeGroup}
          style={{
            borderRadius: 999,
            padding: "7px 14px",
            border: "1px solid rgba(56,189,248,0.9)",
            background:
              "radial-gradient(circle at top left,#38bdf8,#0ea5e9,#020617)",
            color: "#e0f2fe",
            fontSize: 12,
            cursor:
              !canEdit || !activeGroup ? "not-allowed" : "pointer",
            opacity: !canEdit || !activeGroup ? 0.5 : 1,
            boxShadow: "0 0 16px rgba(56,189,248,0.55)",
          }}
        >
          + New rule
        </button>
      </div>

      {!activeGroup ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            color: "#9ca3af",
          }}
        >
          No lane selected. Choose a group on the left to view and edit rules.
        </div>
      ) : rules.length === 0 ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            color: "#9ca3af",
          }}
        >
          No rules yet in this lane. Click{" "}
          <span style={{ color: "#e5e7eb" }}>+ New rule</span> to define your
          first requirement.
        </div>
      ) : (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onUpdate={(patch) => onUpdate(rule.id, patch)}
              onDelete={() => onDelete(rule.id)}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ===========================
   RIGHT PREVIEW PANEL
   =========================== */

function RightPreviewPanel({
  rules,
  samplePolicyText,
  setSamplePolicyText,
  evaluation,
  onRunEngine,
  onEvaluate,
  saving,
}) {
  return (
    <div
      style={{
        borderRadius: 24,
        padding: 16,
        background:
          "linear-gradient(135deg, rgba(9,15,30,0.98), rgba(4,9,20,0.96))",
        border: "1px solid rgba(88,116,255,0.4)",
        boxShadow:
          "0 26px 70px rgba(15,23,42,0.98), 0 0 32px rgba(59,130,246,0.25)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* LIVE ENGINE SECTION */}
      <div>
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 1.6,
            color: "#9ca3af",
            marginBottom: 6,
          }}
        >
          Live Rule Preview
        </div>

        <p
          style={{
            fontSize: 12,
            color: "#9ca3af",
            marginTop: 0,
            marginBottom: 8,
          }}
        >
          Run the engine across all vendors using the current rule definitions.
        </p>

        <button
          onClick={onRunEngine}
          disabled={saving}
          style={{
            borderRadius: 999,
            padding: "7px 14px",
            border: "1px solid rgba(56,189,248,0.9)",
            background:
              "radial-gradient(circle at top left,#22c55e,#16a34a,#052e16)",
            color: "#ecfdf5",
            fontSize: 12,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Running engine…" : "Run engine now"}
        </button>
      </div>

      {/* SAMPLE POLICY EVAL */}
      <div
        style={{
          marginTop: 4,
          paddingTop: 10,
          borderTop: "1px solid rgba(30,64,175,0.75)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 1.6,
            color: "#9ca3af",
            marginBottom: 6,
          }}
        >
          Sample policy evaluation
        </div>

        <textarea
          value={samplePolicyText}
          onChange={(e) => setSamplePolicyText(e.target.value)}
          rows={8}
          style={{
            width: "100%",
            borderRadius: 12,
            padding: "8px 10px",
            border: "1px solid rgba(51,65,85,0.9)",
            background: "rgba(15,23,42,0.96)",
            color: "#e5e7eb",
            fontFamily: "monospace",
            fontSize: 12,
            marginBottom: 8,
          }}
        />

        <button
          onClick={onEvaluate}
          disabled={!rules.length}
          style={{
            borderRadius: 999,
            padding: "7px 14px",
            border: "1px solid rgba(129,140,248,0.9)",
            background:
              "linear-gradient(120deg,rgba(30,64,175,1),rgba(15,23,42,1))",
            color: "#e0e7ff",
            fontSize: 12,
            cursor: !rules.length ? "not-allowed" : "pointer",
            opacity: !rules.length ? 0.5 : 1,
          }}
        >
          Evaluate sample policy
        </button>

        {/* RESULTS */}
        {evaluation.ok && (
          <div
            style={{
              marginTop: 10,
              borderRadius: 12,
              border: "1px solid rgba(30,64,175,0.6)",
              background:
                "radial-gradient(circle,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
              padding: "8px 10px",
              maxHeight: 220,
              overflowY: "auto",
              fontSize: 12,
            }}
          >
            {rules.map((r) => {
              const passed = evaluation.results[r.id];
              return (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    paddingBottom: 6,
                    borderBottom:
                      "1px solid rgba(30,64,175,0.45)",
                  }}
                >
                  <div>
                    <div style={{ color: "#e5e7eb" }}>
                      <code style={{ color: "#93c5fd" }}>
                        {r.field_key}
                      </code>{" "}
                      {operatorLabel(r.operator)}{" "}
                      <code style={{ color: "#a5b4fc" }}>
                        {r.expected_value}
                      </code>
                    </div>
                    {r.requirement_text && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9ca3af",
                          marginTop: 2,
                        }}
                      >
                        {r.requirement_text}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      borderRadius: 999,
                      padding: "3px 10px",
                      border: passed
                        ? "1px solid #22c55e"
                        : "1px solid #ef4444",
                      color: passed ? "#22c55e" : "#ef4444",
                      background: passed
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(239,68,68,0.15)",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    {passed ? "Pass" : "Fail"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
// -----------------------------------------------------
// RULE CARD — COCKPIT STYLE
// -----------------------------------------------------

function RuleCard({ rule, onUpdate, onDelete, canEdit }) {
  const sevColor =
    SEVERITY_COLORS[rule.severity] || SEVERITY_COLORS.medium;

  return (
    <div
      className="tactical-card"
      style={{
        position: "relative",
        borderRadius: 18,
        padding: 14,
        background:
          "linear-gradient(145deg, rgba(10,15,30,0.95), rgba(5,10,22,0.92))",
        border: "1px solid rgba(88,116,255,0.45)",
        boxShadow:
          "0 0 22px rgba(30,64,175,0.4), inset 0 0 18px rgba(8,16,32,0.7)",
        overflow: "hidden",
      }}
    >
      {/* hover wash */}
      <div
        className="tactical-hover"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 18,
          background:
            "linear-gradient(120deg, rgba(80,120,255,0.16), rgba(120,60,255,0.14))",
          opacity: 0,
          pointerEvents: "none",
          transition: "opacity 0.25s ease",
        }}
      />
      <style>{`
        .tactical-card:hover .tactical-hover {
          opacity: 1 !important;
        }
      `}</style>

      {/* FIELD + OPERATOR */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <select
          value={rule.field_key || ""}
          onChange={(e) => onUpdate({ field_key: e.target.value })}
          disabled={!canEdit}
          style={{
            flex: 1,
            borderRadius: 12,
            padding: "7px 9px",
            border: "1px solid rgba(51,65,85,0.85)",
            background:
              "linear-gradient(120deg,rgba(17,25,45,0.96),rgba(15,23,42,0.9))",
            color: "#e5e7eb",
            fontSize: 12,
          }}
        >
          {FIELD_OPTIONS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          value={rule.operator || "equals"}
          onChange={(e) => onUpdate({ operator: e.target.value })}
          disabled={!canEdit}
          style={{
            width: 150,
            borderRadius: 12,
            padding: "7px 9px",
            border: "1px solid rgba(51,65,85,0.85)",
            background:
              "linear-gradient(120deg,rgba(17,25,45,0.96),rgba(15,23,42,0.9))",
            color: "#e5e7eb",
            fontSize: 12,
          }}
        >
          {OPERATOR_OPTIONS.map((op) => (
            <option key={op.key} value={op.key}>
              {op.label}
            </option>
          ))}
        </select>
      </div>

      {/* EXPECTED + SEVERITY */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <input
          value={rule.expected_value || ""}
          onChange={(e) => onUpdate({ expected_value: e.target.value })}
          disabled={!canEdit}
          placeholder="Expected value"
          style={{
            flex: 1,
            borderRadius: 12,
            padding: "7px 9px",
            border: "1px solid rgba(51,65,85,0.85)",
            background:
              "linear-gradient(120deg,rgba(17,25,45,0.96),rgba(15,23,42,0.9))",
            color: "#e5e7eb",
            fontSize: 12,
          }}
        />

        <select
          value={rule.severity || "medium"}
          onChange={(e) => onUpdate({ severity: e.target.value })}
          disabled={!canEdit}
          style={{
            width: 140,
            borderRadius: 12,
            padding: "7px 9px",
            border: `1px solid ${sevColor}`,
            background:
              "linear-gradient(120deg,rgba(17,25,45,0.98),rgba(15,23,42,0.94))",
            color: sevColor,
            fontSize: 12,
            fontWeight: 600,
            textTransform: "capitalize",
          }}
        >
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* HUMAN TEXT + NOTE */}
      <input
        value={rule.requirement_text || ""}
        onChange={(e) => onUpdate({ requirement_text: e.target.value })}
        disabled={!canEdit}
        placeholder="Plain language requirement…"
        style={{
          width: "100%",
          borderRadius: 12,
          padding: "7px 9px",
          border: "1px solid rgba(51,65,85,0.85)",
          background:
            "linear-gradient(120deg,rgba(17,25,45,0.96),rgba(15,23,42,0.9))",
          color: "#e5e7eb",
          fontSize: 12,
          marginBottom: 6,
        }}
      />

      <input
        value={rule.internal_note || ""}
        onChange={(e) => onUpdate({ internal_note: e.target.value })}
        disabled={!canEdit}
        placeholder="Internal note (optional)"
        style={{
          width: "100%",
          borderRadius: 12,
          padding: "7px 9px",
          border: "1px solid rgba(51,65,85,0.85)",
          background:
            "linear-gradient(120deg,rgba(17,25,45,0.96),rgba(15,23,42,0.9))",
          color: "#94a3b8",
          fontSize: 12,
          marginBottom: 10,
        }}
      />

      {/* FOOTER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 4,
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "#9ca3af",
          }}
        >
          <input
            type="checkbox"
            checked={rule.is_active ?? true}
            onChange={(e) => onUpdate({ is_active: e.target.checked })}
            disabled={!canEdit}
          />
          Active
        </label>

        <button
          onClick={onDelete}
          disabled={!canEdit}
          style={{
            borderRadius: 999,
            padding: "5px 11px",
            border: "1px solid rgba(248,113,113,0.95)",
            background:
              "linear-gradient(120deg,rgba(127,29,29,0.95),rgba(76,5,5,0.9))",
            color: "#fecaca",
            fontSize: 11,
            fontWeight: 600,
            cursor: canEdit ? "pointer" : "not-allowed",
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------
// HELPERS
// -----------------------------------------------------

function operatorLabel(op) {
  const found = OPERATOR_OPTIONS.find((o) => o.key === op);
  return found ? found.label : op;
}

function evaluateRule(rule, policyObj) {
  if (!rule || rule.is_active === false) return false;

  const rawVal = policyObj[rule.field_key];
  const expected = rule.expected_value;
  const op = rule.operator || "equals";

  switch (op) {
    case "equals":
      return String(rawVal) === String(expected);
    case "not_equals":
      return String(rawVal) !== String(expected);
    case "contains":
      return String(rawVal)
        .toLowerCase()
        .includes(String(expected).toLowerCase());
    case "gte":
      return Number(rawVal) >= Number(expected);
    case "lte":
      return Number(rawVal) <= Number(expected);
    default:
      return false;
  }
}
