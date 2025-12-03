// emails/vendor/UploadRequest.js
import EmailLayout from "./EmailLayout";

export default function UploadRequest({ vendor, org, portalUrl }) {
  return (
    <EmailLayout org={org}>
      <h3 style={{ marginTop: 0, fontSize: 18 }}>COI Upload Requested</h3>

      <p style={{ fontSize: 14, lineHeight: 1.5 }}>
        Hello {vendor?.name || "Vendor"},  
        <br /><br />
        To continue working with {org?.name}, we need an updated Certificate of Insurance (COI).
      </p>

      <p style={{ fontSize: 14, lineHeight: 1.5 }}>
        Please upload your COI using the secure link below:
      </p>

      <a
        href={portalUrl}
        style={{
          display: "inline-block",
          marginTop: 12,
          padding: "10px 18px",
          background: "linear-gradient(90deg,#38bdf8,#0ea5e9)",
          color: "#0f172a",
          borderRadius: 8,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Upload COI →
      </a>

      <p style={{ marginTop: 20, fontSize: 13, opacity: 0.8 }}>
        If you have questions or need assistance, feel free to reply to this email.
      </p>
    </EmailLayout>
  );
}
