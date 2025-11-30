// components/ai/CopilotLauncher.js
import { useState } from "react";
import CopilotBox from "./CopilotBox";

export default function CopilotLauncher({
  persona,
  orgId,
  vendorId = null,
  policyId = null,
  position = "bottom-right", // future: top-right, inline, etc.
}) {
  const [open, setOpen] = useState(false);

  // Position styles
  const positions = {
    "bottom-right": { bottom: 20, right: 20 },
    "bottom-left": { bottom: 20, left: 20 },
    "top-right": { top: 20, right: 20 },
  };

  return (
    <>
      {/* LAUNCHER BUTTON */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            ...positions[position],
            zIndex: 9999,
            borderRadius: "999px",
            padding: "10px 18px",
            background:
              "linear-gradient(90deg,rgba(56,189,248,0.35),rgba(168,85,247,0.35))",
            border: "1px solid rgba(56,189,248,0.5)",
            color: "#e5e7eb",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 0 16px rgba(56,189,248,0.25)",
            backdropFilter: "blur(8px)",
          }}
        >
          🤖 Open Copilot
        </button>
      )}

      {/* ACTUAL COPILOT PANEL */}
      {open && (
        <CopilotBox
          persona={persona}
          orgId={orgId}
          vendorId={vendorId}
          policyId={policyId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
