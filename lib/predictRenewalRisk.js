// lib/predictRenewalRisk.js

export function predictRenewalRisk({ expirationDate, alertsCount }) {
  if (!expirationDate) return { score: 15, label: "Missing" };

  const now = new Date();
  const exp = new Date(expirationDate);
  const days = Math.floor((exp - now) / 86400000);

  let score = 100;

  if (days < 0) score -= 70;       // expired
  else if (days <= 3) score -= 55;
  else if (days <= 7) score -= 40;
  else if (days <= 30) score -= 25;

  if (alertsCount >= 5) score -= 15;
  if (alertsCount >= 10) score -= 30;

  if (score < 0) score = 0;

  return {
    score,
    label:
      score >= 75 ? "Likely Renew" :
      score >= 55 ? "At Risk" :
      score >= 35 ? "High Risk" :
      "Critical",
  };
}
