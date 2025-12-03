// components/renewals/VendorRenewalStatusPanel.js

import { useEffect, useState } from "react";

const GP = {
  neonGreen: "#22c55e",
  neonGold: "#facc15",
  neonRed: "#fb7185",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
  bgPanel: "rgba(15,23,42,0.98)",
  borderSoft: "rgba(51,65,85,0.9)",
};

function parseExpiration(dateStr) {
  if (!dateStr) return null;
  const parts = String(dateStr).split("/");
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts;
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function computeDaysLeft(dateStr) {
  const d = parseExpiration(dateStr);
  if (!d) return null;
  const diffMs = d.getTime() - Date.now();
  return Math.floor(diffMs / 86400000);
}

export default function VendorRenewalStatusPanel({
  vendorId,
  orgId,
  expirationDate,
}) {
  const [engineLoading, setEngineLoading] = useState(false);
  const [engineError, setEngineError] = useState("");
  const [engineScore, setEngineScore] = useState(null);
  const [engineTier, setEngineTier] = useState("Unknown");

  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState("");
  const [alerts, setAlerts] = useState([]);

  const daysLeft = computeDaysLeft(expirationDate);

  useEffect(() => {
    if (!vendorId || !orgId) return;

    async function loadEngine() {
      try {
        setEngineLoading(true);
        setEngineError("");

        const res = await fetch("/api/engine/run-v3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vendorId, orgId }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Rule Engine V3 failed.");
        }

        const score = json.globalScore ?? null;
        setEngineScore(score);

        if (typeof score === "number") {
          if (score >= 85) setEngineTier("Elite Safe");
          else if (score >= 70) setEngineTier("Preferred");
          else if (score >= 55) setEngineTier("Watch");
          else if (score >= 35) setEngineTier("High Risk");
          else setEngineTier("Severe");
        } else {
          setEngineTier("Unknown");
        }
      } catch (err) {
        console.error("[VendorRenewalStatusPanel] engine error:", err);
        setEngineError(err.message || "Failed to load V3 score.");
      } finally {
        setEngineLoading(false);
      }
    }

    async function loadAlerts() {
      try {
        setAlertsLoading(true);
        setAlertsError("");

        const params = new URLSearchParams();
        params.set("vendorId", vendorId);
        if (orgId) params.set("orgId", orgId);

        const res = await fetch(`/api/alerts/vendor-v3?${params.toString()}`);
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Failed to load alerts.");
        }

        setAlerts(json.alerts || []);
      } catch (err) {
        console.error("[VendorRenewalStatusPanel] alerts error:", err);
        setAlertsError(err.message || "Failed to load alerts.");
      } finally {
        setAlertsLoading(false);
      }
    }

    loadEngine();
    loadAlerts();
  }, [vendorId, orgId]);

  const scoreColor =
    engineScore == null
      ? GP.textSoft
      : engineScore >= 80
      ? GP.neonGreen
      : engineScore >= 60
      ? GP.neonGold
      : GP.neonRed;

  return (
    <div
      style={{
        borderRadius: 20,
        padding: 16,
        background: GP.bgPanel,
        border: `1px solid ${GP.borderSoft}`,
        boxShadow: "0 16px 40px rgba(15,23,42,0.9)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        {/* Left: Countdown + expiration */}
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: GP.textSoft,
              marginBottom: 4,
            }}
          >
            Renewal Status
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                color:
                  daysLeft == null
                    ? GP.textSoft
                    : daysLeft <= 3
                    ? GP.neonRed
                    : daysLeft <= 7
                    ? GP.neonGold
                    : GP.neonGreen,
              }}
            >
              {daysLeft == null ? "—" : daysLeft}
            </div>
            <div
              style={{
                fontSize: 12,
                color: GP.textSoft,
              }}
            >
              days until expiration
            </div>
          </div>

          <div
            style={{
              fontSize: 12,
              color: GP.textSoft,
            }}
          >
            Expires on{" "}
            <span style={{ color: GP.text }}>
              {expirationDate || "Not set"}
            </span>
          </div>
        </div>

        {/* Right: V3 Risk */}
        <div
          style={{
            minWidth: 180,
            textAlign: "right",
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: GP.textSoft,
              marginBottom: 4,
            }}
          >
            Rule Engine V3
          </div>

          {engineLoading ? (
            <div style={{ fontSize: 12, color: GP.textSoft }}>
              Calculating risk…
            </div>
          ) : engineError ? (
            <div style={{ fontSize: 12, color: GP.neonRed }}>
              {engineError}
            </div>
          ) : (
            <div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: scoreColor,
                }}
              >
                {engineScore == null ? "—" : engineScore}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: GP.textSoft,
                }}
              >
                {engineTier}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alerts list */}
      <div
        style={{
          marginTop: 10,
          borderTop: "1px solid rgba(51,65,85,0.9)",
          paddingTop: 10,
        }}
      >
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: GP.textSoft,
            marginBottom: 6,
          }}
        >
          Alerts
        </div>

        {alertsLoading && (
          <div style={{ fontSize: 12, color: GP.textSoft }}>
            Loading alerts…
          </div>
        )}

        {alertsError && !alertsLoading && (
          <div style={{ fontSize: 12, color: GP.neonRed }}>{alertsError}</div>
        )}

        {!alertsLoading && !alertsError && alerts.length === 0 && (
          <div style={{ fontSize: 12, color: GP.textSoft }}>
            🎉 No active alerts for this vendor.
          </div>
        )}

        {!alertsLoading && !alertsError && alerts.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              maxHeight: 180,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {alerts.map((a, idx) => {
              const color =
                a.severity === "critical"
                  ? GP.neonRed
                  : a.severity === "high"
                  ? GP.neonGold
                  : a.severity === "medium"
                  ? GP.neonBlue
                  : GP.textSoft;
           

              return (
                <div
                  key={idx}
                  style={{
                    borderRadius: 10,
                    padding: "6px 8px",
                    border: `1px solid ${color}55`,
                    background: "rgba(15,23,42,0.96)",
                    fontSize: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      marginBottom: 2,
                      color,
                    }}
                  >
                    {a.code} ·{" "}
                    <span style={{ textTransform: "capitalize" }}>
                      {a.severity}
                    </span>
                  </div>
                  <div style={{ color: GP.text }}>{a.message}</div>
                  {a.createdAt && (
                    <div
                      style={{
                        fontSize: 10,
                        color: GP.textSoft,
                        marginTop: 2,
                      }}
                    >
                      {new Date(a.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
