// components/elite/ConditionBuilder.jsx
import { useState } from "react";

const tdStyle = {
  padding: "8px 6px",
  borderBottom: "1px solid #E5EAF2",
};

export default function ConditionBuilder({ rule, onUpdateRule }) {
  const [localConditions, setLocalConditions] = useState(
    rule.conditions || []
  );

  const updateParent = (updated) => {
    setLocalConditions(updated);
    onUpdateRule(rule.id, { conditions: updated });
  };

  const addCondition = () => {
    const newCond = { field: "", operator: "equals", value: "" };
    updateParent([...localConditions, newCond]);
  };

  const updateCondition = (index, key, value) => {
    const updated = [...localConditions];
    updated[index][key] = value;
    updateParent(updated);
  };

  const removeCondition = (index) => {
    const updated = localConditions.filter((_, i) => i !== index);
    updateParent(updated);
  };

  return (
    <div style={{ marginTop: "20px" }}>
      <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "10px" }}>
        Conditions
      </h3>

      {/* CONDITION TABLE */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={tdStyle}>Field</th>
            <th style={tdStyle}>Operator</th>
            <th style={tdStyle}>Value</th>
            <th style={tdStyle}></th>
          </tr>
        </thead>

        <tbody>
          {localConditions.map((cond, index) => (
            <tr key={index}>
              {/* FIELD */}
              <td style={tdStyle}>
                <input
                  value={cond.field}
                  onChange={(e) =>
                    updateCondition(index, "field", e.target.value)
                  }
                  placeholder="e.g. vendor.insured"
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid #D6DFEA",
                  }}
                />
              </td>

              {/* OPERATOR */}
              <td style={tdStyle}>
                <select
                  value={cond.operator}
                  onChange={(e) =>
                    updateCondition(index, "operator", e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid #D6DFEA",
                  }}
                >
                  <option value="equals">Equals</option>
                  <option value="not_equals">Not Equals</option>
                  <option value="contains">Contains</option>
                  <option value="greater_than">Greater Than</option>
                  <option value="less_than">Less Than</option>
                </select>
              </td>

              {/* VALUE */}
              <td style={tdStyle}>
                <input
                  value={cond.value}
                  onChange={(e) =>
                    updateCondition(index, "value", e.target.value)
                  }
                  placeholder="value"
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid #D6DFEA",
                  }}
                />
              </td>

              {/* REMOVE */}
              <td style={tdStyle}>
                <button
                  onClick={() => removeCondition(index)}
                  style={{
                    background: "transparent",
                    color: "#FF3B3B",
                    fontWeight: 700,
                    fontSize: "18px",
                    cursor: "pointer",
                    border: "none",
                  }}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ADD BUTTON */}
      <button
        onClick={addCondition}
        style={{
          marginTop: "12px",
          width: "100%",
          padding: "10px",
          borderRadius: "8px",
          background: "#0057FF",
          color: "white",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        + Add Condition
      </button>
    </div>
  );
}
