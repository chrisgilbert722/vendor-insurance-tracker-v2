// emails/vendor/FixIssues.js
import EmailLayout from "./EmailLayout";

export default function FixIssues({ vendor, org, issues = [], portalUrl }) {
  return (
    <EmailLayout org={org}>
      <h3 style={{ marginTop: 0, fontSize: 18 }}>Issues Found In Your COI</h3>

      <p style={{ fontSize: 14, lineHeight: 1.5 }}>
        Hello {vendor?.name || "Vendor"},  
        <br /><br />
        We reviewed your Certificate of Insurance and found the following items that need attention:
      </p>

      {issues.length === 0 ? (
        <p style={{ fontSize: 14 }}>• Issue list unavailable. Please review your COI in the portal.</p>
      ) : (
        <ul style={{ fontSize: 14, lineHeight: 1.6 }}>
          {issues.map((i, idx) => (
            <li key={idx}>{i.label || i.code}: {i.message}</li>
          ))}
        </ul>
      )}

      <p style={{ fontSize: 14 }}>
        You can review and fix these items at the link below:
      </p>

      <a
        href={portalUrl}
        style={{
          display: "inline-block",
          marginTop: 12,
          padding: "10px 18px",
          background: "linear-gradient(90deg,#facc15,#eab308)",
          color: "#0f172a",
          borderRadius: 8,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        View Issues →
      </a>
    </EmailLayout>
  );
}
