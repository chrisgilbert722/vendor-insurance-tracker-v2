// components/renewals/RenewalStageBadge.js

export default function RenewalStageBadge({ stage }) {
  let color = "#9ca3af";
  let label = `${stage}d`;

  if (stage === 90) color = "#38bdf8";
  if (stage === 30) color = "#facc15";
  if (stage === 7) color = "#fb923c";
  if (stage === 3) color = "#fb7185";
  if (stage === 1) color = "#f43f5e";
  if (stage === 0) {
    color = "#b91c1c";
    label = "Expired";
  }

  return (
    <div
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        background: "rgba(15,23,42,0.9)",
        border: `1px solid ${color}`,
        color,
        fontSize: 11,
        fontWeight: 600,
        textAlign: "center",
      }}
    >
      {label}
    </div>
  );
}
