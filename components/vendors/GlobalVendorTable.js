// components/vendors/GlobalVendorTable.js
// Global Vendor Table with Create Vendor functionality

import { useEffect, useState } from "react";
import { useRouter } from "next/router";

// ============================================================
// TOAST COMPONENT
// ============================================================
function Toast({ open, message, type, onClose }) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => onClose(), 4000);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  if (!open) return null;

  const bgColor =
    type === "success"
      ? "rgba(22,163,74,0.95)"
      : type === "error"
      ? "rgba(220,38,38,0.95)"
      : "rgba(59,130,246,0.95)";

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 9999,
        padding: "12px 20px",
        borderRadius: 12,
        background: bgColor,
        color: "#fff",
        fontSize: 14,
        fontWeight: 500,
        boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
        animation: "slideIn 0.3s ease",
      }}
    >
      {message}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function GlobalVendorTable({ orgId }) {
  const router = useRouter();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Create vendor modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "" });
  const [creating, setCreating] = useState(false);

  // Toast state
  const [toast, setToast] = useState({ open: false, message: "", type: "info" });

  function showToast(message, type = "info") {
    setToast({ open: true, message, type });
  }

  // Listen for visibility changes and custom events to trigger refetch
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setRefreshKey((k) => k + 1);
      }
    };

    const handleVendorsChanged = () => {
      setRefreshKey((k) => k + 1);
    };

    const handleStorage = (e) => {
      if (e?.key === "vendors:changed" || e?.key === "policies:changed") {
        handleVendorsChanged();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("vendors:changed", handleVendorsChanged);
    window.addEventListener("policies:changed", handleVendorsChanged);
    window.addEventListener("onboarding:complete", handleVendorsChanged);
    window.addEventListener("storage", handleStorage);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("vendors:changed", handleVendorsChanged);
      window.removeEventListener("policies:changed", handleVendorsChanged);
      window.removeEventListener("onboarding:complete", handleVendorsChanged);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!orgId) return;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/vendors/gvi?orgId=${orgId}`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);

        setVendors(Array.isArray(data.vendors) ? data.vendors : []);
      } catch (err) {
        console.error("[vendors] load error", err);
        setError("Failed to load vendors");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [orgId, refreshKey]);

  // CREATE VENDOR HANDLER
  async function handleCreateVendor(e) {
    e.preventDefault();

    if (!createForm.name.trim()) {
      showToast("Vendor name is required", "error");
      return;
    }

    setCreating(true);

    try {
      const res = await fetch("/api/vendors/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          email: createForm.email.trim() || null,
          orgId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to create vendor");
      }

      showToast(`Vendor "${createForm.name}" created!`, "success");
      setShowCreateModal(false);
      setCreateForm({ name: "", email: "" });
      setRefreshKey((k) => k + 1); // Refresh list

      // Dispatch event for other components
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("vendors:changed"));
        localStorage.setItem("vendors:changed", Date.now().toString());
      }
    } catch (err) {
      console.error("[vendors] create error", err);

      // Simulate success for dry-run if API fails
      const mockVendor = {
        id: `mock-${Date.now()}`,
        name: createForm.name.trim(),
        email: createForm.email.trim() || null,
        external_uuid: `mock-uuid-${Date.now()}`,
        status: "pending",
        aiScore: null,
        alertsCount: 0,
      };

      setVendors((prev) => [mockVendor, ...prev]);
      showToast(`Vendor "${createForm.name}" created (simulated)`, "info");
      setShowCreateModal(false);
      setCreateForm({ name: "", email: "" });
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div style={{ fontSize: 12, color: "#9ca3af", padding: 20, textAlign: "center" }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "999px",
            border: "3px solid rgba(56,189,248,0.3)",
            borderTopColor: "#38bdf8",
            animation: "spin 1s linear infinite",
            margin: "0 auto 12px",
          }}
        />
        Loading vendors...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return <div style={{ fontSize: 12, color: "#fecaca" }}>{error}</div>;
  }

  return (
    <div>
      {/* Toast */}
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, open: false })}
      />

      {/* CREATE VENDOR MODAL */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div
            style={{
              borderRadius: 24,
              padding: 24,
              maxWidth: 450,
              width: "90%",
              background: "radial-gradient(circle at top left,rgba(15,23,42,0.99),rgba(15,23,42,0.97))",
              border: "1px solid rgba(56,189,248,0.6)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.9)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 28 }}>🏢</span>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#e5e7eb" }}>Create New Vendor</h3>
                <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>Add a vendor to your organization</p>
              </div>
            </div>

            <form onSubmit={handleCreateVendor}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>
                  Vendor Name *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Acme Construction LLC"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "1px solid rgba(51,65,85,0.9)",
                    background: "rgba(15,23,42,0.9)",
                    color: "#e5e7eb",
                    fontSize: 14,
                    outline: "none",
                  }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="vendor@example.com"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "1px solid rgba(51,65,85,0.9)",
                    background: "rgba(15,23,42,0.9)",
                    color: "#e5e7eb",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    flex: 1,
                    padding: "12px 18px",
                    borderRadius: 999,
                    border: "1px solid rgba(75,85,99,0.8)",
                    background: "rgba(15,23,42,0.9)",
                    color: "#9ca3af",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !createForm.name.trim()}
                  style={{
                    flex: 1,
                    padding: "12px 18px",
                    borderRadius: 999,
                    border: "1px solid rgba(34,197,94,0.9)",
                    background: creating
                      ? "rgba(34,197,94,0.3)"
                      : "radial-gradient(circle at top left,#22c55e,#15803d,#0f172a)",
                    color: "#e5f2ff",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: creating || !createForm.name.trim() ? "not-allowed" : "pointer",
                    opacity: !createForm.name.trim() ? 0.5 : 1,
                  }}
                >
                  {creating ? "Creating..." : "Create Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HEADER WITH CREATE BUTTON */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 12, color: "#9ca3af" }}>
          {vendors.length} vendor{vendors.length !== 1 ? "s" : ""} in organization
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: "10px 18px",
            borderRadius: 999,
            border: "1px solid rgba(34,197,94,0.9)",
            background: "radial-gradient(circle at top left,#22c55e,#15803d,#0f172a)",
            color: "#e5f2ff",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 0 20px rgba(34,197,94,0.4)",
          }}
        >
          <span>+</span> Create Vendor
        </button>
      </div>

      {/* EMPTY STATE */}
      {vendors.length === 0 && (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            borderRadius: 16,
            border: "1px dashed rgba(75,85,99,0.6)",
            background: "rgba(15,23,42,0.5)",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
          <div style={{ fontSize: 16, color: "#e5e7eb", marginBottom: 8 }}>No vendors yet</div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
            Create your first vendor to start tracking their insurance compliance.
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: "12px 24px",
              borderRadius: 999,
              border: "1px solid rgba(56,189,248,0.9)",
              background: "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
              color: "#e5f2ff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            + Create First Vendor
          </button>
        </div>
      )}

      {/* TABLE */}
      {vendors.length > 0 && (
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Vendor", "Status", "AI Score", "Alerts", "Actions"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "8px 10px",
                    color: "#9ca3af",
                    borderBottom: "1px solid rgba(51,65,85,0.9)",
                    textAlign: "left",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {vendors.map((v) => {
              const key = v.external_uuid || v.id || Math.random();
              const status = v.status || v.computedStatus || "unknown";
              const isMock = String(v.id).startsWith("mock-");

              return (
                <tr
                  key={key}
                  onClick={() => {
                    if (isMock) {
                      showToast("This is a simulated vendor", "info");
                      return;
                    }
                    router.push(`/admin/vendor/${v.id}`);
                  }}
                  style={{
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(56,189,248,0.08)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td style={cell}>
                    {v.name}
                    {isMock && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 999,
                          background: "rgba(234,179,8,0.2)",
                          border: "1px solid rgba(234,179,8,0.5)",
                          color: "#fbbf24",
                        }}
                      >
                        Simulated
                      </span>
                    )}
                  </td>
                  <td style={cell}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 999,
                        fontSize: 10,
                        textTransform: "uppercase",
                        background:
                          status === "compliant"
                            ? "rgba(34,197,94,0.2)"
                            : status === "pending"
                            ? "rgba(234,179,8,0.2)"
                            : "rgba(239,68,68,0.2)",
                        color:
                          status === "compliant"
                            ? "#22c55e"
                            : status === "pending"
                            ? "#fbbf24"
                            : "#ef4444",
                      }}
                    >
                      {status}
                    </span>
                  </td>
                  <td style={cell}>{v.aiScore ?? "—"}</td>
                  <td style={cell}>{v.alertsCount ?? 0}</td>

                  <td style={{ ...cell, textAlign: "right" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "6px 14px",
                        borderRadius: 999,
                        border: "1px solid rgba(56,189,248,0.9)",
                        background:
                          "radial-gradient(circle at top,#38bdf8,#0ea5e9,#020617)",
                        color: "#e0f2fe",
                        fontSize: 11,
                        fontWeight: 700,
                        boxShadow: "0 0 18px rgba(56,189,248,0.6)",
                        pointerEvents: "none",
                      }}
                    >
                      ⚡ Review
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const cell = {
  padding: "8px 10px",
  borderBottom: "1px solid rgba(51,65,85,0.6)",
};
