// pages/requirements.js
import { useEffect, useState } from "react";
import Link from "next/link";
import { useOrg } from "../../context/OrgContext";
import { useRole } from "../../lib/useRole";

export default function RequirementsPage() {
  const { activeOrgId, loadingOrgs } = useOrg();
  const { isAdmin, loading: loadingRole } = useRole();

  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form fields (hybrid: your simple UX + richer schema)
  const [coverageType, setCoverageType] = useState("");
  const [minEach, setMinEach] = useState("");
  const [minAgg, setMinAgg] = useState("");
  const [requireAdditionalInsured, setRequireAdditionalInsured] = useState(false);
  const [requireWaiver, setRequireWaiver] = useState(false);
  const [minRiskScore, setMinRiskScore] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Load requirements for active org
  useEffect(() => {
    if (!activeOrgId) return;

    async function loadRequirements() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/requirements?orgId=${activeOrgId}`);
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
  }, [activeOrgId]);

  function resetForm() {
    setCoverageType("");
    setMinEach("");
    setMinAgg("");
    setRequireAdditionalInsured(false);
    setRequireWaiver(false);
    setMinRiskScore("");
    setNotes("");
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");

    if (!activeOrgId) {
      setError("No active organization selected.");
      return;
    }

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
          orgId: activeOrgId,
          coverage_type: coverageType.trim(),
          min_limit_each_occurrence: minEach ? Number(minEach) : null,
          min_limit_aggregate: minAgg ? Number(minAgg) : null,
          require_additional_insured: requireAdditionalInsured,
          require_waiver: requireWaiver,
          min_risk_score: minRiskScore ? Number(minRiskScore) : null,
          notes: notes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to create requirement");
      }

      setRequirements((prev) => [...prev, data.requirement]);
      resetForm();
    } catch (err) {
      console.error("CREATE REQUIREMENT ERROR:", err);
      setError(err.message || "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function updateField(index, field, value) {
    setRequirements((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  async function handleSaveRow(index) {
    const rule = requirements[index];
    if (!activeOrgId) return;

    if (!rule.coverage_type || !rule.coverage_type.trim()) {
      alert("Coverage type is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rule.id,
          orgId: activeOrgId,
          coverage_type: rule.coverage_type.trim(),
          min_limit_each_occurrence: rule.min_limit_each_occurrence
            ? Number(rule.min_limit_each_occurrence)
            : null,
          min_limit_aggregate: rule.min_limit_aggregate
            ? Number(rule.min_limit_aggregate)
            : null,
          require_additional_insured: !!rule.require_additional_insured,
          require_waiver: !!rule.require_waiver,
          min_risk_score: rule.min_risk_score ? Number(rule.min_risk_score) : null,
          notes: rule.notes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to save requirement");
      }

      // Replace row with updated server version
      setRequirements((prev) => {
        const copy = [...prev];
        copy[index] = data.requirement;
        return copy;
      });
    } catch (err) {
      console.error("SAVE REQUIREMENT ERROR:", err);
      setError(err.message || "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this requirement?")) return;
    setError("");

    try {
      const res = await fetch(`/api/requirements?id=${id}`, {
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

  const locked = loadingOrgs || loadingRole;

  // Non-admins: read-only message
  if (!loadingRole && !isAdmin) {
    return (
      <div style={{ padding: "30px 40px" }}>
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
            Only administrators can edit organization-wide coverage requirements.  
            You have read-only access.
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
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "30px 40px" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        {/* HEADER */}
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
          Define which coverages your vendors must carry, minimum limits, endorsement
          rules, and risk thresholds. This engine powers vendor COI evaluations.
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

        {(loading || locked || !activeOrgId) && (
          <p
            style={{
              marginTop: "12px",
              fontSize: "12px",
              color: "#6b7280",
            }}
          >
            {locked
              ? "Loading organization and role…"
              : !activeOrgId
              ? "Select an organization from the top bar to configure requirements."
              : "Loading requirements…"}
          </p>
        )}

        {/* FORM CARD (your original structure, upgraded fields) */}
        <form
          onSubmit={handleCreate}
          style={{
            marginTop: "20px",
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
            Add Requirement
          </h2>

          {/* Coverage Type */}
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
              style={input}
            />
          </div>

          {/* Limits row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "#111827",
                  marginBottom: "4px",
                }}
              >
                Min Each Occurrence (optional, in dollars)
              </label>
              <input
                type="number"
                value={minEach}
                onChange={(e) => setMinEach(e.target.value)}
                placeholder="1000000"
                style={input}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "#111827",
                  marginBottom: "4px",
                }}
              >
                Min Aggregate (optional, in dollars)
              </label>
              <input
                type="number"
                value={minAgg}
                onChange={(e) => setMinAgg(e.target.value)}
                placeholder="2000000"
                style={input}
              />
            </div>
          </div>

          {/* Endorsement toggles */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              marginBottom: "10px",
            }}
          >
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
                checked={requireAdditionalInsured}
                onChange={(e) => setRequireAdditionalInsured(e.target.checked)}
              />
              Require Additional Insured
            </label>

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
                checked={requireWaiver}
                onChange={(e) => setRequireWaiver(e.target.checked)}
              />
              Require Waiver of Subrogation
            </label>
          </div>

          {/* Min Risk + Notes */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "#111827",
                  marginBottom: "4px",
                }}
              >
                Min Risk Score (0–100, optional)
              </label>
              <input
                type="number"
                value={minRiskScore}
                onChange={(e) => setMinRiskScore(e.target.value)}
                placeholder="80"
                style={input}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "#111827",
                  marginBottom: "4px",
                }}
              >
                Notes (optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Follow ISO form CG 00 01"
                style={input}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !activeOrgId}
            style={{
              padding: "8px 16px",
              borderRadius: "999px",
              border: "none",
              background: saving ? "#9ca3af" : "#111827",
              color: "#f9fafb",
              fontSize: "13px",
              fontWeight: 600,
              cursor: saving || !activeOrgId ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Add Requirement"}
          </button>
        </form>

        {/* LIST CARD */}
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

          {loading && (
            <p style={{ fontSize: "13px", color: "#6b7280" }}>Loading…</p>
          )}

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
                  <th style={th}>Min Each Occ</th>
                  <th style={th}>Min Aggregate</th>
                  <th style={th}>Add'l Insured</th>
                  <th style={th}>Waiver</th>
                  <th style={th}>Min Risk</th>
                  <th style={th}>Notes</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((r, index) => (
                  <tr key={r.id}>
                    <td style={td}>
                      <input
                        type="text"
                        value={r.coverage_type || ""}
                        onChange={(e) =>
                          updateField(index, "coverage_type", e.target.value)
                        }
                        style={rowInput}
                      />
                    </td>
                    <td style={td}>
                      <input
                        type="number"
                        value={r.min_limit_each_occurrence ?? ""}
                        onChange={(e) =>
                          updateField(
                            index,
                            "min_limit_each_occurrence",
                            e.target.value
                          )
                        }
                        style={rowInput}
                        placeholder="1000000"
                      />
                    </td>
                    <td style={td}>
                      <input
                        type="number"
                        value={r.min_limit_aggregate ?? ""}
                        onChange={(e) =>
                          updateField(
                            index,
                            "min_limit_aggregate",
                            e.target.value
                          )
                        }
                        style={rowInput}
                        placeholder="2000000"
                      />
                    </td>
                    <td style={td}>
                      <input
                        type="checkbox"
                        checked={!!r.require_additional_insured}
                        onChange={(e) =>
                          updateField(
                            index,
                            "require_additional_insured",
                            e.target.checked
                          )
                        }
                      />
                    </td>
                    <td style={td}>
                      <input
                        type="checkbox"
                        checked={!!r.require_waiver}
                        onChange={(e) =>
                          updateField(
                            index,
                            "require_waiver",
                            e.target.checked
                          )
                        }
                      />
                    </td>
                    <td style={td}>
                      <input
                        type="number"
                        value={r.min_risk_score ?? ""}
                        onChange={(e) =>
                          updateField(index, "min_risk_score", e.target.value)
                        }
                        style={rowInput}
                        placeholder="80"
                      />
                    </td>
                    <td style={td}>
                      <input
                        type="text"
                        value={r.notes || ""}
                        onChange={(e) =>
                          updateField(index, "notes", e.target.value)
                        }
                        style={rowInput}
                        placeholder="Optional notes"
                      />
                    </td>
                    <td style={td}>
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          onClick={() => handleSaveRow(index)}
                          disabled={saving}
                          style={{
                            fontSize: "11px",
                            padding: "4px 10px",
                            borderRadius: "999px",
                            border: "none",
                            cursor: saving ? "not-allowed" : "pointer",
                            background: "#111827",
                            color: "#f9fafb",
                            fontWeight: 600,
                          }}
                        >
                          Save
                        </button>
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
                      </div>
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

const input = {
  width: "100%",
  padding: "8px",
  fontSize: "13px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
};

const rowInput = {
  width: "100%",
  padding: "4px 6px",
  fontSize: "12px",
  borderRadius: "6px",
  border: "1px solid #d1d5db",
};

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
