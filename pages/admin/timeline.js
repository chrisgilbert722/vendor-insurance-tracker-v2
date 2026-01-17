// pages/admin/timeline.js
// ============================================================
// EXEC TIMELINE V5 — COMPLIANCE EVENT COMMAND
// Cinematic audit trail powered by /api/admin/timeline
// ============================================================

import { useEffect, useState } from "react";
import { useOrg } from "../../context/OrgContext";

import CommandShell from "../../components/v5/CommandShell";
import { V5 } from "../../components/v5/v5Theme";

/* ------------------------------------------------------------
   HELPERS
------------------------------------------------------------ */
function formatTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function sourceColor(source) {
  if (source === "alert") return V5.red;
  if (source === "document") return V5.blue;
  if (source === "system") return V5.purple;
  return V5.soft;
}

function eventLabel(type) {
  if (!type) return "Event";
  return String(type)
    .replace(/_/g, " ")
    .toUpperCase();
}

/* ------------------------------------------------------------
   PAGE
------------------------------------------------------------ */
export default function AdminTimelineV5() {
  const { activeOrgId: orgId } = useOrg();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Listen for visibility changes and custom events to trigger refetch
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setRefreshKey((k) => k + 1);
      }
    };

    const handleTimelineChanged = () => {
      setRefreshKey((k) => k + 1);
    };

    const handleStorage = (e) => {
      if (e?.key === "policies:changed" || e?.key === "alerts:changed") {
        handleTimelineChanged();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("policies:changed", handleTimelineChanged);
    window.addEventListener("alerts:changed", handleTimelineChanged);
    window.addEventListener("onboarding:complete", handleTimelineChanged);
    window.addEventListener("storage", handleStorage);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("policies:changed", handleTimelineChanged);
      window.removeEventListener("alerts:changed", handleTimelineChanged);
      window.removeEventListener("onboarding:complete", handleTimelineChanged);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!orgId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `/api/admin/timeline?orgId=${encodeURIComponent(orgId)}`
        );
        const json = await res.json().catch(() => ({}));

        if (!json?.ok) {
          throw new Error("Timeline unavailable");
        }

        if (!alive) return;
        setEvents(Array.isArray(json.timeline) ? json.timeline : []);
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Failed loading timeline");
        setEvents([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => (alive = false);
  }, [orgId, refreshKey]);

  return (
    <CommandShell
      tag="EXEC AUDIT • TIMELINE"
      title="Compliance Timeline"
      subtitle="Every compliance, alert, and document event across your organization"
      status={loading ? "SYNCING" : error ? "DEGRADED" : "ONLINE"}
      statusColor={loading ? V5.blue : error ? V5.red : V5.green}
    >
      {/* STATUS */}
      {loading && (
        <div style={{ fontSize: 13, color: V5.soft }}>
          Loading compliance events…
        </div>
      )}

      {!loading && error && (
        <div style={{ fontSize: 13, color: V5.red }}>{error}</div>
      )}

      {!loading && !error && events.length === 0 && (
        <div style={{ fontSize: 13, color: V5.soft }}>
          No compliance events recorded yet.
        </div>
      )}

      {/* EVENT STREAM */}
      {!loading && !error && events.length > 0 && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {events.map((ev, idx) => {
            const color = sourceColor(ev.source);

            return (
              <div
                key={ev.id || idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "12px minmax(0,1fr)",
                  gap: 14,
                  padding: "14px 16px",
                  borderRadius: 20,
                  border: `1px solid ${V5.border}`,
                  background: V5.panel,
                  boxShadow:
                    "0 0 26px rgba(0,0,0,0.55), inset 0 0 22px rgba(0,0,0,0.6)",
                }}
              >
                {/* TIMELINE DOT */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    paddingTop: 4,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: color,
                      boxShadow: `0 0 14px ${color}`,
                    }}
                  />
                </div>

                {/* EVENT CONTENT */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color,
                      fontWeight: 900,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    {eventLabel(ev.event_type)}
                  </div>

                  <div style={{ fontSize: 13, color: V5.text }}>
                    {ev.payload?.message ||
                      "Compliance event recorded."}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      color: V5.soft,
                      display: "flex",
                      gap: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>Time: {formatTime(ev.occurred_at)}</span>
                    {ev.vendor_id && (
                      <span>Vendor ID: {ev.vendor_id}</span>
                    )}
                    {ev.alert_id && (
                      <span>Alert ID: {ev.alert_id}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CommandShell>
  );
}
