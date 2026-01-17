// pages/vendor-pages/view.js
// DEPRECATED - Legacy vendor view page
// Frozen for launch. Do not add features or fix API calls.

import { useRouter } from "next/router";
import { useEffect } from "react";

export default function DeprecatedVendorViewPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/vendors");
    }, 3000);
    return () => clearTimeout(timer);
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
        textAlign: "center",
        padding: 24,
      }}
    >
      <div>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>
          Vendor Portal Coming Soon
        </h1>
        <p style={{ color: "#9ca3af", marginBottom: 16 }}>
          This page is under construction.
        </p>
        <p style={{ color: "#6b7280", fontSize: 13 }}>
          Redirecting to vendors list...
        </p>
      </div>
    </div>
  );
}
