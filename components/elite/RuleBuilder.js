// --- Elite Rule Builder UI (Phase C – Drop 2) ---
// Place this at: /components/elite/RuleBuilder.js

import React, { useState } from "react";
import {
  CONDITION_TYPES,
  ACTION_TYPES,
  EliteCondition,
  EliteAction,
  EliteRule,
} from "../../lib/elite/models";

export default function RuleBuilder() {
  const [rules, setRules] = useState([]);
  const [activeRule, setActiveRule] = useState({
    id: Date.now(),
    name: "",
    conditions: [],
    action: null,
  });

  // Add a new empty condition
  const addCondition = () => {
    const newCondition = new EliteCondition({
      id: Date.now(),
      type: CONDITION_TYPES.EXPIRES_IN_DAYS,
      value: "",
    });

    setActiveRule({
      ...activeRule,
      conditions: [...activeRule.conditions, newCondition],
    });
  };

  // Update a condition
  const updateCondition = (id, key, val) => {
    setActiveRule({
      ...activeRule,
      conditions: activeRule.conditions.map((c) =>
        c.id === id ? { ...c, [key]: val } : c
      ),
    });
  };

  // Delete a condition
  const deleteCondition = (id) => {
    setActiveRule({
      ...activeRule,
      conditions: activeRule.conditions.filter((c) => c.id !== id),
    });
  };

  // Choose action type
  const setAction = (type) => {
    const labelMap = {
      [ACTION_TYPES.PASS]: "Pass",
      [ACTION_TYPES.WARN]: "Warning",
      [ACTION_TYPES.FAIL]: "Fail",
    };

    const action = new EliteAction({
      id: Date.now(),
      type,
      label: labelMap[type],
    });

    setActiveRule({ ...activeRule, action });
  };

  // Save rule into set
  const saveRule = () => {
    if (!activeRule.name.trim()) {
      alert("Rule must have a name");
      return;
    }
    if (!activeRule.action) {
      alert("Rule needs an action");
      return;
    }

    const ruleToAdd = new EliteRule({
      id: activeRule.id,
      name: activeRule.name,
      conditions: activeRule.conditions,
      action: activeRule.action,
    });

    setRules([...rules, ruleToAdd]);

    // Reset builder
    setActiveRule({
      id: Date.now(),
      name: "",
      conditions: [],
      action: null,
    });
  };

  // Delete entire rule
  const deleteRule = (id) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  return (
    <div style={{ padding: 30 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 20 }}>
        Elite Rule Builder (Phase C)
      </h1>

      {/* --- RULE CREATION PANEL --- */}
      <div
        style={{
          background: "#fff",
          padding: 20,
          borderRadius: 12,
          marginBottom: 40,
          boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
        }}
      >
        {/* Rule Name */}
        <label style={{ fontWeight: 600 }}>Rule Name</label>
        <input
          type="text"
          placeholder="Example: Policy expires soon"
          value={activeRule.name}
          onChange={(e) =>
            setActiveRule({ ...activeRule, name: e.target.value })
          }
          style={{
            width: "100%",
            padding: 10,
            marginTop: 8,
            marginBottom: 20,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />

        {/* Conditions */}
        <div>
          <label style={{ fontWeight: 600 }}>Conditions</label>

          {activeRule.conditions.map((cond) => (
            <div
              key={cond.id}
              style={{
                display: "flex",
                gap: 10,
                marginTop: 10,
                padding: 10,
                background: "#F7F9FC",
                borderRadius: 8,
              }}
            >
              {/* Condition Type Dropdown */}
              <select
                value={cond.type}
                onChange={(e) =>
                  updateCondition(cond.id, "type", e.target.value)
                }
                style={{
                  padding: "8px 10px",
                  border: "1px solid #ccc",
                  borderRadius: 8,
                }}
              >
                {Object.entries(CONDITION_TYPES).map(([key, val]) => (
                  <option key={key} value={val}>
                    {val}
                  </option>
                ))}
              </select>

              {/* Condition Value (if required) */}
              <input
                type="text"
                placeholder="Value..."
                value={cond.value}
                onChange={(e) =>
                  updateCondition(cond.id, "value", e.target.value)
                }
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                }}
              />

              {/* Delete condition */}
              <button
                onClick={() => deleteCondition(cond.id)}
                style={{
                  background: "#ff4d4f",
                  border: "none",
                  color: "#fff",
                  padding: "8px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          ))}

          {/* Add Another Condition */}
          <button
            onClick={addCondition}
            style={{
              marginTop: 10,
              background: "#0070f3",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
            }}
          >
            + Add Condition
          </button>
        </div>

        {/* Action */}
        <div style={{ marginTop: 30 }}>
          <label style={{ fontWeight: 600 }}>Action</label>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            {Object.values(ACTION_TYPES).map((type) => (
              <button
                key={type}
                onClick={() => setAction(type)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border:
                    activeRule.action?.type === type
                      ? "2px solid #0070f3"
                      : "1px solid #ccc",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Save Rule Button */}
        <button
          onClick={saveRule}
          style={{
            marginTop: 30,
            background: "#28a745",
            color: "#fff",
            padding: "12px 18px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          Save Rule
        </button>
      </div>

      {/* --- RULE LIST PANEL --- */}
      <div>
        <h2 style={{ marginBottom: 10 }}>Saved Rules</h2>

        {rules.map((r) => (
          <div
            key={r.id}
            style={{
              background: "#fff",
              padding: 15,
              borderRadius: 10,
              marginBottom: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{r.name}</div>
              <div style={{ fontSize: 13, opacity: 0.6 }}>
                {r.conditions.length} conditions — action:{" "}
                <strong>{r.action.label}</strong>
              </div>
            </div>

            <button
              onClick={() => deleteRule(r.id)}
              style={{
                background: "#ff4d4f",
                color: "#fff",
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
