// pages/admin/rules-v3/rule/[id].js
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

export default function RuleEditor() {
  const router = useRouter();
  const { id, groupId, orgId } = router.query;

  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [rule, setRule] = useState(null);

  const [type, setType] = useState("coverage");
  const [field, setField] = useState("");
  const [condition, setCondition] = useState("exists");
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!id || isNew) return;
    loadRule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadRule() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/admin/rules-v3/rule?id=${id}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to load rule");
      const r = json.rule;
      setRule(r);
      setType(r.type || "coverage");
      setField(r.field || "");
      setCondition(r.condition || "exists");
      setValue(r.value || "");
      setMessage(r.message || "");
      setSeverity(r.severity || "medium");
      setActive(r.active);
    } catch (err) {
      console.error("[RuleEditor] load error", err);
      setError(err.message || "Failed to load rule");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");

      const payload = {
        type,
        field,
        condition,
        value,
        message,
        severity,
        active,
      };

      let res;
      if (isNew) {
        if (!groupId) {
          throw new Error("Missing groupId for new rule");
        }
        res = await fetch("/api/admin/rules-v3/rule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            groupId: Number(groupId),
          }),
        });
      } else {
        res = await fetch("/api/admin/rules-v3/rule", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            id: Number(id),
          }),
        });
      }

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to save rule");

      const gId = isNew ? groupId : json.rule.group_id;
      router.push(
        `/admin/rules-v3/group/${gId}${orgId ? `?orgId=${orgId}` : ""}`
      );
    } catch (err) {
      console.error("[RuleEditor] save error", err);
      setError(err.message || "Failed to save rule");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (isNew) return;
    if (!window.confirm("Delete this rule?")) return;
    try {
      setSaving(true);
      setError("");
      const res = await fetch("/api/admin/rules-v3/rule", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Number(id) }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to delete rule");

      router.back();
    } catch (err) {
      console.error("[RuleEditor] delete error", err);
      setError(err.message || "Failed to delete rule");
    } finally {
      setSaving(false);
    }
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
        Loading rule…
      </div>
    );
  }

  if (error && !rule && !isNew) {
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
          <div style={{ fontSize: 14 }}>{error}</div>
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
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            marginBottom: 12,
            fontSize: 12,
            color: GP.textSoft,
            border: "none",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>

        <h1
          style={{
            fontSize: 20,
            marginBottom: 10,
            background: "linear-gradient(90deg,#38bdf8,#facc15)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          {isNew ? "Create Rule" : "Edit Rule"}
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

        <form
          onSubmit={handleSave}
          style={{
            borderRadius: 14,
            border: `1px solid ${GP.border}`,
            background: GP.panel,
            padding: 14,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: 10,
              marginBottom: 10,
            }}
          >
            {/* TYPE */}
            <div>
              <div style={{ fontSize: 12, color: GP.textSoft, marginBottom: 4 }}>
                Type
              </div>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: `1px solid ${GP.border}`,
                  background: "#020617",
                  color: GP.text,
                  fontSize: 12,
                }}
              >
                <option value="coverage">coverage</option>
                <option value="limit">limit</option>
                <option value="endorsement">endorsement</option>
                <option value="date">date</option>
                <option value="custom">custom</option>
              </select>
            </div>

            {/* FIELD */}
            <div>
              <div style={{ fontSize: 12, color: GP.textSoft, marginBottom: 4 }}>
                Field (e.g. general_liability_limit)
              </div>
              <input
                value={field}
                onChange={(e) => setField(e.target.value)}
                placeholder="field key used in AI JSON"
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: `1px solid ${GP.border}`,
                  background: "#020617",
                  color: GP.text,
                  fontSize: 12,
                }}
              />
            </div>

            {/* CONDITION */}
            <div>
              <div style={{ fontSize: 12, color: GP.textSoft, marginBottom: 4 }}>
                Condition
              </div>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: `1px solid ${GP.border}`,
                  background: "#020617",
                  color: GP.text,
                  fontSize: 12,
                }}
              >
                <option value="exists">exists</option>
                <option value="missing">missing</option>
                <option value="gte">≥ (greater than or equal)</option>
                <option value="lte">≤ (less than or equal)</option>
                <option value="requires">requires (endorsement)</option>
                <option value="before">before (date)</option>
                <option value="after">after (date)</option>
              </select>
            </div>

            {/* VALUE */}
            <div>
              <div style={{ fontSize: 12, color: GP.textSoft, marginBottom: 4 }}>
                Value (limit / endorsement / date)
              </div>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. 1000000 or CG2010"
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: `1px solid ${GP.border}`,
                  background: "#020617",
                  color: GP.text,
                  fontSize: 12,
                }}
              />
            </div>

            {/* SEVERITY */}
            <div>
              <div style={{ fontSize: 12, color: GP.textSoft, marginBottom: 4 }}>
                Severity
              </div>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                style={{
                  width: "100%",
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
            </div>

            {/* ACTIVE */}
            <div>
              <div style={{ fontSize: 12, color: GP.textSoft, marginBottom: 4 }}>
                Active
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: GP.textSoft,
                }}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                Enabled
              </label>
            </div>
          </div>

          {/* MESSAGE */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: GP.textSoft, marginBottom: 4 }}>
              Message (what the vendor/admin sees when rule fails)
            </div>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder='Example: "General Liability limit must be at least $1,000,000."'
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: `1px solid ${GP.border}`,
                background: "#020617",
                color: GP.text,
                fontSize: 12,
                resize: "vertical",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginTop: 4,
            }}
          >
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "7px 12px",
                borderRadius: 999,
                border: "1px solid rgba(34,197,94,0.7)",
                background: "rgba(22,163,74,0.25)",
                color: GP.neonGreen,
                fontSize: 12,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              💾 Save Rule
            </button>

            {!isNew && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                style={{
                  padding: "7px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(248,113,113,0.7)",
                  background: "rgba(127,29,29,0.35)",
                  color: GP.neonRed,
                  fontSize: 12,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                🗑 Delete Rule
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
