// pages/requirements.js
import { useEffect, useState } from "react";
import Link from "next/link";

export default function RequirementsPage() {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [coverageType, setCoverageType] = useState("");
  const [minimumLimit, setMinimumLimit] = useState("");
  const [required, setRequired] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadRequirements() {
      try {
        const res = await fetch("/api/requirements");
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Failed to load requirements");
        }
        setRequirements(data.requirements || []);
      } catch (err) {
        console.error("LOAD REQUIREMENTS ERROR:", err);
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    loadRequirements();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    if (!coverageType.trim()) {
      setError("Coverage type is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coverage_type: coverageType,
          minimum_limit: minimumLimit ? parseInt(minimumLimit, 10) : null,
          required,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to create rule");
      }

      setRequirements((prev) => [...prev, data.requirement]);
      setCoverageType("");
      setMinimumLimit("");
      setRequired(true);
    } catch (err) {
      console.error("CREATE REQUIREMENT ERROR:", err);
      setError(err.message || "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this requirement?")) return;
    setError("");
    try {
      const res = await fetch(`/api/requirements/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to delete requirement");
      }
      setRequirements((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("DELETE REQUIREMENT ERROR:", err);
      setError(err.message || "Unknown error");
    }
  }

  async function handleToggleRequired(rule) {
    setError("");
    try {
      const res = await fetch(`/api/requirements/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ required: !rule.required }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to update requirement");
      }
      setRequirements((prev) =>
        prev.map((r) => (r.id === rule.id ? data.requirement : r))
      );
    } catch (err) {
      console.error("TOGGLE REQUIRED ERROR:", err);
      setError(err.message || "Unknown error");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: "30px 40px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        <p
          style={{
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "#6b7280",
          }}
        >
          G-Track · Requirements
        </p>
        <h1
          style={{
            fontSize: "28px",
            marginTop: "6px",
            marginBottom: "8px",
            fontWeight: 700,
            color: "#111827",
          }}
        >
          Coverage Requirements (Org-wide)
        </h1>
        <p style={{ fontSize: "14px", color: "#4b5563", marginBottom: "16px" }}>
          Define which coverages your vendors must carry and the minimum limits
          you expect. This engine will be used to evaluate vendor COIs.
        </p>

        <Link
          href="/dashboard"
          style={{
            fontSize: "12px",
            color: "#2563eb",
            textDecoration: "none",
          }}
        >
          ← Back to Dashboard
        </Link>

        {error && (
          <p
            style={{
              marginTop: "12px",
              fontSize: "12px",
              color: "#b91c1c",
            }}
          >
            ⚠ {error}
          </p>
        )}

        {/* Form */}
        <form
          onSubmit={handleCreate}
          style={{
            marginTop: "20px",
            padding: "16px",
            borderRadius: "12px",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            maxWidth: "520px",
          }}
        >
          <h2
            style={{
              fontSize: "14px",
              fontWeight: 600,
              marginBottom: "10px",
              color: "#111827",
            }}
          >
            Add Requirement
          </h2>

          <div style={{ marginBottom: "10px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                color: "#111827",
                marginBottom: "4px",
              }}
            >
              Coverage Type (e.g. "General Liability", "Auto", "Workers Comp")
            </label>
            <input
              type="text"
              value={coverageType}
              onChange={(e) => setCoverageType(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "13px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
              }}
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                color: "#111827",
                marginBottom: "4px",
              }}
            >
              Minimum Limit (optional, in dollars)
            </label>
            <input
              type="number"
              value={minimumLimit}
              onChange={(e) => setMinimumLimit(e.target.value)}
              placeholder="1000000"
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "13px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
              }}
            />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: "#111827",
              }}
            >
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
              />
              Required coverage (if unchecked, treated as optional)
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "8px 16px",
              borderRadius: "999px",
              border: "none",
              background: saving ? "#9ca3af" : "#111827",
              color: "#f9fafb",
              fontSize: "13px",
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Add Requirement"}
          </button>
        </form>

        {/* List */}
        <div
          style={{
            marginTop: "24px",
            padding: "16px",
            borderRadius: "12px",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
          }}
        >
          <h2
            style={{
              fontSize: "14px",
              fontWeight: 600,
              marginBottom: "10px",
              color: "#111827",
            }}
          >
            Current Requirements
          </h2>

          {loading && <p style={{ fontSize: "13px" }}>Loading…</p>}

          {!loading && requirements.length === 0 && (
            <p style={{ fontSize: "13px", color: "#6b7280" }}>
              No requirements defined yet.
            </p>
          )}

          {!loading && requirements.length > 0 && (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr>
                  <th style={th}>Coverage Type</th>
                  <th style={th}>Minimum Limit</th>
                  <th style={th}>Required</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>{r.coverage_type}</td>
                    <td style={td}>
                      {r.minimum_limit ? `$${r.minimum_limit.toLocaleString()}` : "—"}
                    </td>
                    <td style={td}>
                      <button
                        onClick={() => handleToggleRequired(r)}
                        style={{
                          fontSize: "11px",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          border: "none",
                          cursor: "pointer",
                          background: r.required ? "#22c55e" : "#e5e7eb",
                          color: r.required ? "#022c22" : "#374151",
                        }}
                      >
                        {r.required ? "Required" : "Optional"}
                      </button>
                    </td>
                    <td style={td}>
                      <button
                        onClick={() => handleDelete(r.id)}
                        style={{
                          fontSize: "11px",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          border: "none",
                          cursor: "pointer",
                          background: "#fee2e2",
                          color: "#b91c1c",
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: "6px 8px",
  fontSize: "11px",
  color: "#6b7280",
  borderBottom: "1px solid #e5e7eb",
};

const td = {
  padding: "8px 8px",
  borderBottom: "1px solid #f3f4f6",
  fontSize: "13px",
  color: "#111827",
};
