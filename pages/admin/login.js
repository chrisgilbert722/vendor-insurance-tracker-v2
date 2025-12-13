import { getProviders, signIn } from "next-auth/react";

export default function AdminLogin({ providers }) {
  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 460, borderRadius: 18, border: "1px solid rgba(51,65,85,0.9)", background: "rgba(15,23,42,0.98)", padding: 18 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Admin Sign In</h1>
        <p style={{ marginTop: 8, color: "#9ca3af", fontSize: 13 }}>
          Sign in using your organization’s SSO provider.
        </p>

        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {providers &&
            Object.values(providers).map((p) => (
              <button
                key={p.id}
                onClick={() => signIn(p.id, { callbackUrl: "/dashboard" })}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(56,189,248,0.7)",
                  background: "linear-gradient(90deg, rgba(56,189,248,0.9), rgba(14,165,233,0.9))",
                  color: "#07121f",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Continue with {p.name}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  const providers = await getProviders();
  return { props: { providers } };
}
