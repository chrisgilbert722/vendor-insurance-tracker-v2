// pages/admin/login.js
// Admin Login Redirect — SAFE MODE
// Uses existing Supabase magic-link auth
// Removes NextAuth entirely to prevent build errors

import { useEffect } from "react";
import { useRouter } from "next/router";

export default function AdminLogin() {
  const router = useRouter();

  useEffect(() => {
    // Redirect admins to standard login with dashboard redirect
    router.replace("/auth/login?redirect=/dashboard");
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          borderRadius: 18,
          border: "1px solid rgba(51,65,85,0.9)",
          background: "rgba(15,23,42,0.98)",
          padding: 18,
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>Admin Sign In</h1>

        <p style={{ marginTop: 10, color: "#9ca3af", fontSize: 13 }}>
          Redirecting to secure login…
        </p>
      </div>
    </div>
  );
}
