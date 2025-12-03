// emails/vendor/RenewalReminder.js
import EmailLayout from "./EmailLayout";

export default function RenewalReminder({ vendor, org, expirationDate, portalUrl }) {
  return (
    <EmailLayout org={org}>
      <h3 style={{ marginTop: 0, fontSize: 18 }}>COI Renewal Reminder</h3>

      <p style={{ fontSize: 14, lineHeight: 1.5 }}>
        Hello {vendor?.name || "Vendor"},
        <br /><br />
        Our records show that your Certificate of Insurance is expiring on{" "}
        <strong>{expirationDate || "the listed date"}</strong>.
      </p>

      <p style={{ fontSize: 14 }}>
        Please upload your renewed COI using the secure link below:
      </p>

      <a
        href={portalUrl}
        style={{
          display: "inline-block",
          marginTop: 12,
          padding: "10px 18px",
          background: "linear-gradient(90deg,#f87171,#ef4444)",
          color: "#0f172a",
          borderRadius: 8,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Upload Renewal →
      </a>
    </EmailLayout>
  );
}
