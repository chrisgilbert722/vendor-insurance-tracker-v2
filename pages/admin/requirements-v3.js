// pages/admin/requirements-v3.js
import { useEffect, useState, useMemo } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

/* ==========================================================
   REQUIREMENTS ENGINE V3 — ELITE COCKPIT MODE
   ========================================================== */

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

  /* --------------------------
      LOAD GROUPS + RULES
     -------------------------- */
  useEffect(() => {
    if (loadingOrgs) return;
    if (!orgId) {
      setLoading(false);
      return;
    }
    loadGroups();
  }, [orgId, loadingOrgs]);

  async function loadGroups() {
    setLoading(true);
    try {
      const res = await fetch(`/api/requirements-v2/groups?orgId=${orgId}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to load groups");

      let list = json.groups || [];

      // 🔥 FIX — DO NOT USE order_index (causes the column error)
      // Sort safely by created_at instead
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      setGroups(list);

      if (list.length) {
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

  async function loadRulesForGroup(id) {
    if (!id) {
      setRules([]);
      setEvaluation({ ok: false, error: "", results: {} });
      return;
    }
    try {
      const res = await fetch(`/api/requirements-v2/rules?groupId=${id}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to load rules");
      setRules(json.rules || []);
      setEvaluation({ ok: false, error: "", results: {} });
    } catch (err) {
      setError(err.message || "Failed to load rules.");
    }
  }
  /* --------------------------
      GROUP CRUD
     -------------------------- */

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
      if (!json.ok) throw new Error(json.error || "Failed to create group");

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
    setGroups((prev) =>
      prev.map((g) => (g.id === activeGroup.id ? updated : g))
    );

    try {
      setSaving(true);
      const res = await fetch("/api/requirements-v2/groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to update group");

      setToast({ open: true, type: "success", message: "Group updated." });
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGroup(id) {
    if (!canEdit || !id) return;
    if (!window.confirm("Delete this group and all its rules?")) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/requirements-v2/groups?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to delete group");

      const remaining = groups.filter((g) => g.id !== id);
      setGroups(remaining);

      if (remaining.length) {
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
  /* --------------------------
      RULE CRUD
     -------------------------- */

  async function handleCreateRule() {
    if (!activeGroup || !canEdit) return;

    const field_key = prompt("Field key (e.g. policy.glEachOccurrence):");
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

  async function handleUpdateRule(id, patch) {
    if (!canEdit || !id) return;

    const current = rules.find((r) => r.id === id);
    if (!current) return;

    const updated = { ...current, ...patch };
    setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));

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

  async function handleDeleteRule(id) {
    if (!canEdit || !id) return;
    if (!window.confirm("Delete this rule?")) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/requirements-v2/rules?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to delete rule");

      setRules((prev) => prev.filter((r) => r.id !== id));
      setToast({ open: true, type: "success", message: "Rule deleted." });
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  /* --------------------------
      ENGINE ACTIONS
     -------------------------- */

  async function handleRunEngine() {
    try {
      setSaving(true);
      const res = await fetch("/api/engine/run-v3", { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Engine run failed");

      setToast({
        open: true,
        type: "success",
        message: "Engine run completed.",
      });
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        message: err.message,
      });
    } finally {
      setSaving(false);
    }
  }

  /* --------------------------
      SAMPLE POLICY EVAL
     -------------------------- */
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
    for (const r of rules) {
      results[r.id] = evaluateRule(r, parsed);
    }

    setEvaluation({ ok: true, error: "", results });
    setToast({
      open: true,
      type: "success",
      message: "Sample evaluated.",
    });
  }
  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(circle at 20% 10%, #020617 0%, #020617 40%, #000 100%)",
        padding: "40px 40px 50px",
        color: "#e5e7eb",
        overflow: "hidden",
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
          opacity: 0.35,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* HEADER */}
      <div style={{ marginBottom: 18, position: "relative", zIndex: 2 }}>
        <div
          style={{
            display: "inline-flex",
            gap: 8,
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.4)",
            background:
              "linear-gradient(120deg,rgba(15,23,42,0.92),rgba(15,23,42,0.7))",
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "#9ca3af",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            Requirements Engine V3
          </span>
          <span
            style={{
              fontSize: 10,
              color: "#38bdf8",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Coverage • Limits • Endorsements
          </span>
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 26,
            fontWeight: 600,
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
            maxWidth: 700,
            fontSize: 13,
            color: "#cbd5f5",
          }}
        >
          Every rule here is evaluated against vendor policies and updates the
          Alerts Cockpit in real time.
        </p>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div
          style={{
            position: "relative",
            zIndex: 2,
            marginBottom: 12,
            padding: "8px 10px",
            borderRadius: 10,
            background: "rgba(127,29,29,0.95)",
            border: "1px solid rgba(248,113,113,0.9)",
            color: "#fecaca",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {!canEdit && (
        <div
          style={{
            position: "relative",
            zIndex: 2,
            marginBottom: 14,
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid rgba(148,163,184,0.6)",
            background: "rgba(15,23,42,0.9)",
            fontSize: 12,
            color: "#e5e7eb",
          }}
        >
          You are in read-only mode.
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
        }}
      >
        {/* LEFT PANEL END */}
        {/* MIDDLE + RIGHT PANELS were already included above */}
      </div>

      {/* SAVING TAG */}
      {saving && (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            padding: "6px 12px",
            borderRadius: 999,
            background: "rgba(15,23,42,0.9)",
            border: "1px solid rgba(148,163,184,0.7)",
            color: "#e5e7eb",
            fontSize: 12,
            zIndex: 50,
          }}
        >
          Saving…
        </div>
      )}

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

/* =======================================================
   RULECARD — ELITE TACTICAL HOLOGRAM EDITION
   ======================================================= */

function RuleCard({ rule, onUpdate, onDelete, canEdit }) {
  const sevColor =
    SEVERITY_COLORS[rule.severity] || SEVERITY_COLORS.medium;

  return (
    <div
      className="tactical-card"
      style={{
        position: "relative",
        borderRadius: 18,
        padding: 16,
        background:
          "linear-gradient(145deg, rgba(10,15,30,0.92), rgba(5,10,22,0.88))",
        border: "1px solid rgba(80,120,255,0.35)",
        boxShadow:
          "0 0 22px rgba(30,64,175,0.35), inset 0 0 20px rgba(8,16,32,0.55)",
        backdropFilter: "blur(8px)",
        transition: "0.25s ease",
        overflow: "hidden",
      }}
    >
      {/* Glow Edge */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 18,
          boxShadow: "0 0 14px rgba(80,120,255,0.45)",
          opacity: 0.45,
          pointerEvents: "none",
        }}
      />

      {/* Hover layer */}
      <div
        className="tactical-hover"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 18,
          background:
            "linear-gradient(120deg, rgba(80,120,255,0.14), rgba(120,60,255,0.12))",
          opacity: 0,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
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
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <select
          value={rule.field_key || ""}
          onChange={(e) => onUpdate({ field_key: e.target.value })}
          disabled={!canEdit}
          style={{
            flex: 1,
            borderRadius: 12,
            padding: "8px 10px",
            border: "1px solid rgba(51,65,85,0.8)",
            background:
              "linear-gradient(120deg, rgba(17,25,45,0.92), rgba(15,23,42,0.88))",
            color: "#e5e7eb",
            fontSize: 13,
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
            width: 160,
            borderRadius: 12,
            padding: "8px 10px",
            border: "1px solid rgba(51,65,85,0.8)",
            background:
              "linear-gradient(120deg, rgba(17,25,45,0.92), rgba(15,23,42,0.88))",
            color: "#e5e7eb",
            fontSize: 13,
          }}
        >
          {OPERATOR_OPTIONS.map((op) => (
            <option key={op.key} value={op.key}>
              {op.label}
            </option>
          ))}
        </select>
      </div>

      {/* VALUE + SEVERITY */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <input
          value={rule.expected_value || ""}
          onChange={(e) => onUpdate({ expected_value: e.target.value })}
          disabled={!canEdit}
          placeholder="Expected value"
          style={{
            flex: 1,
            borderRadius: 12,
            padding: "8px 10px",
            border: "1px solid rgba(51,65,85,0.8)",
            background:
              "linear-gradient(120deg, rgba(17,25,45,0.92), rgba(15,23,42,0.88))",
            color: "#e5e7eb",
            fontSize: 13,
          }}
        />

        <select
          value={rule.severity || "medium"}
          onChange={(e) => onUpdate({ severity: e.target.value })}
          disabled={!canEdit}
          style={{
            width: 140,
            borderRadius: 12,
            padding: "8px 10px",
            border: `1px solid ${sevColor}`,
            background:
              "linear-gradient(120deg, rgba(17,25,45,0.95), rgba(15,23,42,0.92))",
            color: sevColor,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 0.4,
            textTransform: "capitalize",
          }}
        >
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* REQUIREMENT TEXT */}
      <input
        value={rule.requirement_text || ""}
        onChange={(e) => onUpdate({ requirement_text: e.target.value })}
        disabled={!canEdit}
        placeholder="Plain language requirement…"
        style={{
          width: "100%",
          borderRadius: 12,
          padding: "8px 10px",
          border: "1px solid rgba(51,65,85,0.8)",
          background:
            "linear-gradient(120deg, rgba(17,25,45,0.92), rgba(15,23,42,0.88))",
          color: "#e5e7eb",
          fontSize: 13,
          marginBottom: 6,
        }}
      />

      {/* INTERNAL NOTE */}
      <input
        value={rule.internal_note || ""}
        onChange={(e) => onUpdate({ internal_note: e.target.value })}
        disabled={!canEdit}
        placeholder="Internal note (optional)"
        style={{
          width: "100%",
          borderRadius: 12,
          padding: "8px 10px",
          border: "1px solid rgba(51,65,85,0.8)",
          background:
            "linear-gradient(120deg, rgba(17,25,45,0.92), rgba(15,23,42,0.88))",
          color: "#94a3b8",
          fontSize: 13,
          marginBottom: 12,
        }}
      />

      {/* FOOTER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          alignItems: "center",
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
          disabled={!canEdit}
          onClick={onDelete}
          style={{
            borderRadius: 12,
            padding: "6px 12px",
            border: "1px solid rgba(248,113,113,0.8)",
            background:
              "linear-gradient(120deg, rgba(255,76,76,0.35), rgba(91,6,6,0.3))",
            color: "#fecaca",
            fontSize: 12,
            fontWeight: 600,
            cursor: canEdit ? "pointer" : "not-allowed",
            boxShadow: "0 0 10px rgba(255,50,50,0.3)",
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/* =======================================================
   OPERATOR LABEL
   ======================================================= */

function operatorLabel(op) {
  const found = OPERATOR_OPTIONS.find((o) => o.key === op);
  return found ? found.label : op;
}

/* =======================================================
   LOCAL PREVIEW RULE ENGINE
   ======================================================= */

function evaluateRule(rule, policyObj) {
  if (!rule || rule.is_active === false) return false;

  const rawVal = policyObj[rule.field_key];
  const expected = rule.expected_value;
  const op = rule.operator || "equals";

  if (rawVal === undefined || rawVal === null) return false;

  const parseNum = (v) => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const cleaned = v.replace(/[^0-9.\-]/g, "");
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  switch (op) {
    case "equals":
      return String(rawVal) === String(expected);
    case "not_equals":
      return String(rawVal) !== String(expected);
    case "contains":
      return String(rawVal)
        .toLowerCase()
        .includes(String(expected).toLowerCase());
    case "gte": {
      const a = parseNum(rawVal);
      const b = parseNum(expected);
      return a !== null && b !== null && a >= b;
    }
    case "lte": {
      const a = parseNum(rawVal);
      const b = parseNum(expected);
      return a !== null && b !== null && a <= b;
    }
    default:
      return false;
  }
}
