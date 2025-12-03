// lib/renewalSla.js

import { classifyRenewal } from "./classifyRenewal";

export function computeRenewalSlaBuckets(renewals = []) {
  const buckets = {
    on_time: 0,
    due_soon: 0,
    critical: 0,
    overdue_0_7: 0,
    overdue_8_30: 0,
    overdue_31_plus: 0,
  };

  const now = new Date();

  renewals.forEach((r) => {
    const exp = r.expiration_date ? new Date(r.expiration_date) : null;
    const status = classifyRenewal(r.expiration_date);

    if (!exp) {
      return;
    }

    const diffDays = Math.floor((exp - now) / 86400000);

    if (diffDays >= 31) {
      buckets.on_time++;
    } else if (diffDays >= 8 && diffDays <= 30) {
      buckets.due_soon++;
    } else if (diffDays >= 0 && diffDays <= 7) {
      buckets.critical++;
    } else if (diffDays < 0) {
      const overdue = Math.abs(diffDays);
      if (overdue <= 7) buckets.overdue_0_7++;
      else if (overdue <= 30) buckets.overdue_8_30++;
      else buckets.overdue_31_plus++;
    }
  });

  return buckets;
}
