// lib/classifyRenewal.js

export function classifyRenewal(expirationDate) {
  if (!expirationDate) return "missing";

  const now = new Date();
  const exp = new Date(expirationDate);
  const days = Math.floor((exp - now) / 86400000);

  if (days < 0) return "overdue";
  if (days <= 7) return "critical";
  if (days <= 30) return "due_soon";
  return "pending";
}
