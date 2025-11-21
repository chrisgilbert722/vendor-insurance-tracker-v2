// pages/admin/vendor/[id].js
import { useRouter } from "next/router";
import { useMemo, useState, useEffect } from "react";

/* ===========================
   THEME TOKENS (unchanged)
=========================== */
const GP = {
  primary: "#0057FF",
  primaryDark: "#003BB3",
  accent1: "#00E0FF",
  accent2: "#8A2BFF",
  red: "#FF3B3B",
  orange: "#FF9800",
  yellow: "#FFC107",
  green: "#00C27A",
  ink: "#0D1623",
  inkSoft: "#64748B",
  surface: "#020617",
  border: "#1E293B",
};

/* ===========================
   VendorProfile Component
=========================== */
export default function VendorProfilePage() {
  const router = useRouter();
  const { id } = router.query;

  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // LIVE ALERTS FOR THIS VENDOR
  const [vendorAlerts, setVendorAlerts] = useState([]);

  /* ============================================================
     LOAD LIVE ALERTS FOR THIS VENDOR (filtered by vendor name/id)
  ============================================================ */
  useEffect(() => {
    if (!vendor?.name) return;

    async function loadVendorAlerts() {
      try {
        const res = await fetch(`/api/alerts/list?orgId=2`);
        const data = await res.json();

        if (data.ok && Array.isArray(data.alerts)) {
          const filtered = data.alerts.filter((a) => {
            const matchName =
              a.vendorName?.toLowerCase() === vendor.name.toLowerCase();
            const matchId = a.vendorId && a.vendorId == vendor.id;
            return matchName || matchId;
          });

          // severity mapping fallback
          const processed = filtered.map((a) => ({
            ...a,
            severity:
              a.severity ||
              (a.type === "rule_failure" &&
              a.message?.includes("Critical")
                ? "Critical"
                : a.type === "rule_failure" &&
                  a.message?.includes("High")
                ? "High"
                : a.type === "rule_failure"
                ? "Medium"
                : a.type === "requirement_failure"
                ? "High"
                : "Low"),
          }));

          setVendorAlerts(processed);
        }
      } catch (err) {
        console.error("Failed to load vendor alerts:", err);
      }
    }

    loadVendorAlerts();
  }, [vendor]);
  
              }}
            >
              Live output from Elite Rule Engine. These alerts match this vendor
              only.
            </div>

            {/* RULE LIST (LIVE ALERTS) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: 220,
                overflowY: "auto",
              }}
            >
              {vendorAlerts.filter((a) => a.type === "rule_failure").length >
              0 ? (
                vendorAlerts
                  .filter((a) => a.type === "rule_failure")
                  .map((alert) => (
                    <RuleRow
                      key={alert.id}
                      rule={{
                        id: alert.id,
                        label: alert.ruleLabel || alert.title || "Rule triggered",
                        description:
                          alert.message ||
                          "Rule fired from compliance engine.",
                        severity: alert.severity || "Medium",
                        timestamp: alert.createdAt,
                        dsl: alert.dsl || "—",
                      }}
                    />
                  ))
              ) : (
                <div
                  style={{
                    borderRadius: 12,
                    padding: 8,
                    border: "1px dashed rgba(75,85,99,0.98)",
                    fontSize: 12,
                    color: "#9ca3af",
                  }}
                >
                  No rule-based alerts for this vendor yet.
                </div>
              )}
            </div>
          </div>
          {/* ===========================
              LIVE COMPLIANCE TIMELINE
          ============================ */}
          <div
            style={{
              borderRadius: 18,
              padding: 10,
              border: "1px solid rgba(51,65,85,0.98)",
              background: "rgba(15,23,42,0.98)",
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: "#9ca3af",
                marginBottom: 4,
              }}
            >
              Compliance timeline
            </div>

            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
                marginBottom: 6,
              }}
            >
              Every event — rule triggers, requirement failures, expirations —
              from the live alerts engine.
            </div>

            {/* SORTED LIVE TIMELINE */}
            <div
              style={{
                position: "relative",
                flex: 1,
                overflowY: "auto",
                paddingTop: 2,
              }}
            >
              {/* vertical guide line */}
              <div
                style={{
                  position: "absolute",
                  left: 10,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background:
                    "linear-gradient(to bottom,rgba(56,189,248,0.35),rgba(56,189,248,0))",
                }}
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  paddingLeft: 0,
                }}
              >
                {vendorAlerts.length > 0 ? (
                  [...vendorAlerts]
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                    )
                    .map((alert, idx) => (
                      <TimelineItem
                        key={alert.id}
                        event={{
                          id: alert.id,
                          label: alert.title || alert.ruleLabel || "Alert",
                          detail: alert.message || "",
                          severity: alert.severity || "Medium",
                          timestamp: alert.createdAt,
                          type: alert.type || "Alert",
                        }}
                        isFirst={idx === 0}
                      />
                    ))
                ) : (
                  <div
                    style={{
                      marginTop: 8,
                      borderRadius: 12,
                      padding: 8,
                      border: "1px dashed rgba(75,85,99,0.98)",
                      fontSize: 12,
                      color: "#9ca3af",
                    }}
                  >
                    Timeline will populate as alerts are generated for this
                    vendor.
                  </div>
                )}
              </div>
            </div>
          </div>
              {/* STATUS + LIVE RISK */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Status (still from vendor object) */}
                  <span
                    style={{
                      padding: "3px 9px",
                      borderRadius: 999,
                      fontSize: 11,
                      border: "1px solid rgba(51,65,85,0.98)",
                      background: "rgba(15,23,42,1)",
                      color: "#e5e7eb",
                    }}
                  >
                    Status: {vendor.status || "Unknown"}
                  </span>

                  {/* LIVE RISK LEVEL */}
                  {(() => {
                    const hasCritical = vendorAlerts.some(
                      (a) => a.severity === "Critical"
                    );
                    const hasHigh = vendorAlerts.some(
                      (a) => a.severity === "High"
                    );

                    const risk = hasCritical
                      ? "High"
                      : hasHigh
                      ? "Medium"
                      : "Low";

                    const riskColor =
                      risk === "High"
                        ? "#f97316"
                        : risk === "Medium"
                        ? "#facc15"
                        : "#22c55e";

                    return (
                      <span
                        style={{
                          padding: "3px 9px",
                          borderRadius: 999,
                          fontSize: 11,
                          border: "1px solid rgba(51,65,85,0.98)",
                          background: "rgba(15,23,42,1)",
                          color: riskColor,
                        }}
                      >
                        Risk: {risk}
                      </span>
                    );
                  })()}
                </div>

                {/* LIVE OPEN ALERTS + CRITICAL COUNT */}
                <div
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                  }}
                >
                  {vendorAlerts.length} open alerts ·{" "}
                  {
                    vendorAlerts.filter((a) => a.severity === "Critical")
                      .length
                  }{" "}
                  critical.
                </div>
              </div>
