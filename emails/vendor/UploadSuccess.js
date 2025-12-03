// emails/vendor/UploadSuccess.js
import EmailLayout from "./EmailLayout";

export default function UploadSuccess({ vendor, org }) {
  return (
    <EmailLayout org={org}>
      <h3 style={{ marginTop: 0, fontSize: 18 }}>COI Successfully Received</h3>

      <p style={{ fontSize: 14, lineHeight: 1.5 }}>
        Hi {vendor?.name || "Vendor"},  
        <br /><br />
        Thank you for submitting your updated Certificate of Insurance.
      </p>

      <p style={{ fontSize: 14 }}>
        Our compliance team will review it shortly and notify you if any additional information is required.
      </p>

      <p style={{ marginTop: 20, fontSize: 13, opacity: 0.8 }}>
        Thank you for staying up to date and compliant.
      </p>
    </EmailLayout>
  );
}
