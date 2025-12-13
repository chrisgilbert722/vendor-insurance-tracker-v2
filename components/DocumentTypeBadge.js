// components/DocumentTypeBadge.js
// ============================================================
// Document Type Badge — V1
// Centralized visual language for compliance documents
// ============================================================

const MAP = {
  coi: {
    label: "COI",
    classes: "bg-sky-500/15 text-sky-300 border-sky-400/40",
  },
  endorsement: {
    label: "Endorsement",
    classes: "bg-indigo-500/15 text-indigo-300 border-indigo-400/40",
  },
  w9: {
    label: "W-9",
    classes: "bg-slate-500/15 text-slate-300 border-slate-400/40",
  },
  contract: {
    label: "Contract",
    classes: "bg-purple-500/15 text-purple-300 border-purple-400/40",
  },
  license: {
    label: "License",
    classes: "bg-amber-500/15 text-amber-300 border-amber-400/40",
  },
  safety: {
    label: "Safety",
    classes: "bg-emerald-500/15 text-emerald-300 border-emerald-400/40",
  },
  other: {
    label: "Document",
    classes: "bg-slate-600/15 text-slate-300 border-slate-500/40",
  },
};

export default function DocumentTypeBadge({ type }) {
  const key = String(type || "other").toLowerCase();
  const cfg = MAP[key] || MAP.other;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  );
}
