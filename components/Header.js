import { supabase } from "../lib/supabaseClient";

export default function Header() {
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  return (
    <div
      style={{
        width: "100%",
        padding: "12px 24px",
        borderBottom: "1px solid #ddd",
        marginBottom: "24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <h3>Vendor Insurance Tracker</h3>

      <button
        onClick={handleLogout}
        style={{
          padding: "8px 16px",
          background: "#222",
          color: "#fff",
          borderRadius: "4px",
          border: "none",
          cursor: "pointer",
        }}
      >
        Sign Out
      </button>
    </div>
  );
}
