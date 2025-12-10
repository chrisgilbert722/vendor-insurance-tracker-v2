// components/onboarding/TeamBrokersStep.js
// STEP 9 — Team & Broker Invites (Magic-Link Based Onboarding)

import { useState } from "react";

export default function TeamBrokersStep({ wizardState, setWizardState }) {
  const existing = wizardState?.team || [];

  const [rows, setRows] = useState(
    existing.length > 0
      ? existing
      : [{ name: "", email: "", role: "admin" }]
  );

  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function updateRow(i, field, value) {
    setRows((prev) => {
      const copy = [...prev];
      copy[i][field] = value;
      return copy;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, { name: "", email: "", role: "staff" }]);
  }

  function removeRow(i) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function saveTeam() {
    setError("");

    const cleaned = rows.filter(
      (r) => r.name.trim() || r.email.trim()
    );

    for (const r of cleaned) {
      if (!r.name.trim()) {
        setError("All invited users must have a name.");
        return;
      }
      if (!r.email.includes("@")) {
        setError(`Email "${r.email}" is invalid.`);
        return;
      }
    }

    setWizardState((prev) => ({
      ...prev,
      team: cleaned,
    }));

    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        background: "rgba(15,23,42,0.96)",
        border: "1px solid rgba(51,65,85,0.9)",
      }}
    >
      <h2
        style={{
          marginTop: 0,
          fontSize: 18,
          fontWeight: 600,
          color: "#e5e7eb",
        }}
      >
        Step 9 — Team & Broker Invitations
      </h2>

      <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
        Add internal team members and external brokers. They’ll receive
        magic-link invitations once onboarding is complete.
      </p>

      {error && (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(127,29,29,0.9)",
            border: "1px solid rgba(248,113,113,0.8)",
            color: "#fecaca",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {rows.map((r, i) => (
        <div
          key={i}
          style={{
            padding: 14,
            borderRadius: 14,
            background: "rgba(2,6,23,0.85)",
            border: "1px solid rgba(71,85,105,0.9)",
            marginBottom: 12,
          }}
        >
          {/* Row block */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
            }}
          >
            {/* Name */}
            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                style={inputStyle}
                value={r.name}
                onChange={(e) => updateRow(i, "name", e.target.value)}
                placeholder="John Doe"
              />
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email</label>
              <input
                style={inputStyle}
                value={r.email}
                onChange={(e) => updateRow(i, "email", e.target.value)}
                placeholder="email@company.com"
              />
            </div>

            {/* Role */}
            <div>
              <label style={labelStyle}>Role</label>
              <select
                value={r.role}
                onChange={(e) => updateRow(i, "role", e.target.value)}
                style={inputStyle}
              >
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="broker">Broker</option>
              </select>
            </div>
          </div>

          {/* Remove row */}
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => removeRow(i)}
              style={{
                marginTop: 10,
                fontSize: 12,
                color: "#fb7185",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              ✖ Remove
            </button>
          )}
        </div>
      ))}

      {/* Add User */}
      <button
        type="button"
        onClick={addRow}
        style={{
          marginBottom: 16,
          padding: "8px 14px",
          borderRadius: 999,
          border: "1px solid rgba(59,130,246,0.9)",
          color: "#e0f2fe",
          background: "rgba(15,23,42,0.9)",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        + Add Another User
      </button>

      {/* Save button */}
      <button
        type="button"
        onClick={saveTeam}
        style={{
          padding: "10px 20px",
          borderRadius: 999,
          border: "1px solid rgba(34,197,94,0.9)",
          background:
            "radial-gradient(circle at top left,#22c55e,#16a34a,#052e16)",
          color: "#ecfdf5",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        ✔ Save Team
      </button>

      {saved && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 10,
            background: "rgba(22,163,74,0.2)",
            border: "1px solid rgba(34,197,94,0.9)",
            color: "#bbf7d0",
            fontSize: 13,
          }}
        >
          Team saved.
        </div>
      )}
    </div>
  );
}

/* Shared styles */
const labelStyle = {
  display: "block",
  fontSize: 12,
  color: "#9ca3af",
  marginBottom: 4,
};

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid rgba(71,85,105,0.9)",
  background: "rgba(2,6,23,0.6)",
  fontSize: 13,
  color: "#e5e7eb",
};
