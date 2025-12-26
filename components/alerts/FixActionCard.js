// components/alerts/FixActionCard.js
// ============================================================
// FIX ACTION CARD — PREVIEW MODE (DAY 10)
// - DEV TEST: Auto-opens Fix Preview for verification
// - REMOVE test block after confirming UI
// ============================================================

import { useState, useEffect } from "react";
import FixPreviewPanel from "../FixPreviewPanel";

export default function FixActionCard({ alert, onResolve, onRequest }) {
  if (!alert?.fix) return null;

  const { title, description, required_document, action, actor } = alert.fix;

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewVendor, setPreviewVendor] = useState(null);

  function openFixPreview() {
    setPreviewVendor({
      name: alert.vendor_name || "Test Vendor",
      issue: title || "Expired COI",
      severity: alert.severity || "critical",
      broker: alert.broker
        ? {
            name: alert.broker.name,
            email: alert.broker.email,
          }
        : {
            name: "Demo Insurance Group",
            email: "broker@demoins.com",
          },
    });

    setPreviewOpen(true);
  }

  /* ======================================================
     DEV TEST BLOCK — REMOVE AFTER CONFIRMING UI
  ====================================================== */
  useEffect(() => {
    // Auto-open Fix Preview for testing
    openFixPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* ====================================================== */

  return (
    <>
      <div
        style={{
          marginTop: 10,
          padding: 12,
          borderRadius: 12,
          background: "rgba(15,23,42,0.85)",
          border: "1px solid rgba(148,163,184,0.35)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "rgba(148,163,184,0.7)",
            marginBottom: 4,
          }}
        >
          Recommended Fix
        </div>

        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>

        <div
          style={{
            fontSize: 13,
            color: "rgba(203,213,245,0.9)",
            marginTop: 4,
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>

        {required_document && (
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "rgba(56,189,248,0.9)",
            }}
          >
            Required: {required_document}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          {action === "request_coi" && (
            <button
              onClick={openFixPreview}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid rgba(34,197,94,0.55)",
                background: "rgba(15,23,42,0.9)",
                color: "#bbf7d0",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Request COI
            </button>
          )}

          <button
            onClick={openFixPreview}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "transparent",
              color: "rgba(148,163,184,0.9)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Mark Resolved
          </button>
        </div>
      </div>

      {/* FIX PREVIEW PANEL (READ-ONLY) */}
      <FixPreviewPanel
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        vendor={previewVendor}
      />
    </>
  );
}
