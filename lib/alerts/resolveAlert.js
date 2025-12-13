// lib/alerts/resolveAlert.js
// ===========================================
// Client helper to resolve / acknowledge alerts
// ===========================================

export async function resolveAlert({
  orgId,
  alertId,
  resolutionType = "resolved",
  note = "",
  resolvedBy = "",
}) {
  const res = await fetch("/api/alerts/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orgId,
      alertId,
      resolutionType,
      note,
      resolvedBy,
    }),
  });

  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.error || "Failed to resolve alert");
  }

  return json.alert;
}
