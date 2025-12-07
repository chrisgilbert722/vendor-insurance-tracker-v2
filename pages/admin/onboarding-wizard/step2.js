// NEW — vendor selection + AI onboarding results
const [selectedVendorIds, setSelectedVendorIds] = useState([]);
const [sendingInvites, setSendingInvites] = useState(false);
const [inviteResults, setInviteResults] = useState(null);
const [resultsOpen, setResultsOpen] = useState(false);
// --------------------------------------------
// SELECT / DESELECT vendor for onboarding
// --------------------------------------------
function toggleVendorSelection(id) {
  setSelectedVendorIds((prev) =>
    prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
  );
}
// --------------------------------------------
// SEND AI ONBOARDING EMAILS (Step 3 trigger)
// --------------------------------------------
async function handleSendInvites() {
  if (!selectedVendorIds.length) {
    return setToast({
      open: true,
      type: "error",
      message: "Select at least one vendor.",
    });
  }

  setSendingInvites(true);

  try {
    const res = await fetch("/api/onboarding/send-vendor-invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: vendors[0]?.org_id || null,
        vendorIds: selectedVendorIds,
      }),
    });

    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.error || "Failed to send onboarding emails.");
    }

    setInviteResults(json);
    setResultsOpen(true);

    setToast({
      open: true,
      type: "success",
      message: `Invites sent: ${json.sentCount}, Failed: ${json.failedCount}`,
    });
  } catch (err) {
    console.error(err);
    setToast({
      open: true,
      type: "error",
      message: err.message || "Failed sending invites.",
    });
  } finally {
    setSendingInvites(false);
  }
}
{profiles.length > 0 && (
  <div style={{ marginTop: 30 }}>
    <h3 style={{ fontSize: 20, marginBottom: 10 }}>
      Select Vendors to Onboard
    </h3>

    {profiles.map((item, idx) => (
      <div
        key={idx}
        style={{
          marginBottom: 20,
          padding: 16,
          borderRadius: 14,
          background: "rgba(15,23,42,0.85)",
          border: "1px solid rgba(148,163,184,0.3)",
        }}
      >
        {/* SELECT BOX */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={selectedVendorIds.includes(item.vendor.id)}
            onChange={() => toggleVendorSelection(item.vendor.id)}
            style={{ width: 18, height: 18 }}
          />
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            {item.vendor.vendor_name}
          </span>
        </label>

        <pre
          style={{
            marginTop: 10,
            whiteSpace: "pre-wrap",
            fontSize: 12,
            color: "#e5e7eb",
            background: "rgba(0,0,0,0.3)",
            padding: 12,
            borderRadius: 10,
          }}
        >
{JSON.stringify(item.profile, null, 2)}
        </pre>
      </div>
    ))}
  </div>
)}
{profiles.length > 0 && (
  <button
    onClick={handleSendInvites}
    disabled={sendingInvites || selectedVendorIds.length === 0}
    style={{
      marginTop: 20,
      padding: "14px 20px",
      borderRadius: 12,
      background: selectedVendorIds.length
        ? "linear-gradient(90deg,#38bdf8,#0ea5e9)"
        : "rgba(148,163,184,0.4)",
      border: "1px solid rgba(56,189,248,0.7)",
      fontSize: 16,
      fontWeight: 600,
      cursor:
        selectedVendorIds.length === 0 ? "not-allowed" : "pointer",
      color: "white",
    }}
  >
    {sendingInvites ? "Sending invites…" : "📨 Send AI Onboarding Emails"}
  </button>
)}
{/* RESULTS DRAWER */}
{resultsOpen && inviteResults && (
  <div
    style={{
      position: "fixed",
      top: 0,
      right: 0,
      width: 420,
      height: "100vh",
      background: "rgba(15,23,42,0.97)",
      padding: 20,
      borderLeft: "1px solid rgba(148,163,184,0.4)",
      boxShadow: "-10px 0 30px rgba(0,0,0,0.6)",
      overflowY: "auto",
      zIndex: 1000,
    }}
  >
    <h2 style={{ marginTop: 0 }}>Onboarding Email Results</h2>

    <p>
      <strong>Sent:</strong> {inviteResults.sentCount}
      <br />
      <strong>Failed:</strong> {inviteResults.failedCount}
    </p>

    <h3>Sent Emails</h3>
    <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
{JSON.stringify(inviteResults.sent, null, 2)}
    </pre>

    <h3>Failed</h3>
    <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#fca5a5" }}>
{JSON.stringify(inviteResults.failed, null, 2)}
    </pre>

    <button
      onClick={() => setResultsOpen(false)}
      style={{
        marginTop: 20,
        padding: "10px 16px",
        borderRadius: 12,
        background: "rgba(31,41,55,0.8)",
        border: "1px solid rgba(148,163,184,0.5)",
        color: "white",
        cursor: "pointer",
      }}
    >
      Close
    </button>
  </div>
)}
