// pages/onboarding/sample-coi.js
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

export default function OnboardingSampleCOI() {
  return (
    <OnboardingLayout
      currentKey="sample-coi"
      title="Upload a Sample COI"
      subtitle="This helps the AI understand how your carriers, brokers, and vendors format their certificates."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1.1fr)",
          gap: 20,
        }}
      >
        {/* Upload Zone (placeholder wired to your existing upload flow later) */}
        <div>
          <div
            style={{
              borderRadius: 16,
              border: "1px dashed rgba(148,163,184,0.8)",
              background:
                "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
              padding: 26,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
            <div
              style={{
                fontSize: 15,
                color: "#e5e7eb",
                marginBottom: 6,
              }}
            >
              Drag & drop a recent COI PDF
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>
              Or click below to select a file from your computer.
            </div>

            <button
              type="button"
              style={{
                padding: "8px 18px",
                borderRadius: 999,
                border: "1px solid rgba(56,189,248,0.9)",
                background:
                  "linear-gradient(90deg,#38bdf8,#0ea5e9,#0f172a)",
                color: "#e5f2ff",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Choose File
            </button>
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "#9ca3af",
            }}
          >
            We’ll parse this COI to understand how your broker formats limits,
            endorsements, and descriptions of operations.
          </div>
        </div>

        {/* Side Info */}
        <div
          style={{
            borderRadius: 18,
            padding: 16,
            border: "1px solid rgba(148,163,184,0.55)",
            background:
              "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
            fontSize: 13,
            color: "#9ca3af",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              marginBottom: 8,
              fontSize: 15,
              color: "#e5e7eb",
            }}
          >
            What we extract
          </h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Policy types, carriers, and effective/expiration dates.</li>
            <li>Limits for GL, Auto, Umbrella, and Workers’ Comp.</li>
            <li>Additional insured, waiver of subrogation, and other endorsements.</li>
          </ul>
        </div>
      </div>
    </OnboardingLayout>
  );
}
