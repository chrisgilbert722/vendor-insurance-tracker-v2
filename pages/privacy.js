// pages/privacy.js

export default function PrivacyPolicy() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 20% 0%, rgba(56,189,248,0.18), transparent 40%), radial-gradient(circle at 80% 0%, rgba(168,85,247,0.15), transparent 35%), linear-gradient(180deg,#020617,#000)",
        padding: "60px 22px",
        color: "#e5e7eb",
      }}
    >
      {/* Hero Header */}
      <div style={{ maxWidth: 900, margin: "0 auto 40px auto" }}>
        <h1
          style={{
            fontSize: 46,
            fontWeight: 700,
            marginBottom: 12,
            background: "linear-gradient(90deg,#38bdf8,#a5b4fc,#fff)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Privacy Policy
        </h1>

        <p style={{ fontSize: 16, color: "#cbd5f5", maxWidth: 800 }}>
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Content */}
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          background: "rgba(15,23,42,0.85)",
          borderRadius: 18,
          padding: 30,
          border: "1px solid rgba(148,163,184,0.35)",
          boxShadow: "0 18px 40px rgba(15,23,42,0.7)",
          lineHeight: 1.65,
          fontSize: 15,
        }}
      >
        <p>
          Vendor Insurance Tracker (“Company”, “we”, “our”, “us”) is committed
          to protecting your personal information. This Privacy Policy explains
          how we collect, use, disclose, and safeguard information in connection
          with our software platform, services, and websites (“Service”).
        </p>

        <h2>1. Information We Collect</h2>
        <p>We collect information in the following categories:</p>
        <ul>
          <li>
            <strong>Account Information:</strong> name, email, company name,
            role, preferences.
          </li>
          <li>
            <strong>Uploaded Documents:</strong> Certificates of Insurance
            (COIs), endorsements, licenses, W-9s, and related files.
          </li>
          <li>
            <strong>AI Processing Data:</strong> extracted policy numbers,
            carriers, dates, endorsements, limits, and related metadata.
          </li>
          <li>
            <strong>Usage Data:</strong> device information, IP address, browser
            type, interactions with the platform.
          </li>
          <li>
            <strong>Billing Information:</strong> handled by third-party
            processors such as Stripe; we do not store full payment card
            numbers.
          </li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide and improve the Service</li>
          <li>Process documents using AI technology</li>
          <li>Analyze insurance compliance and generate alerts</li>
          <li>Maintain customer accounts and permissions</li>
          <li>Communicate updates, alerts, and notifications</li>
          <li>Manage billing and subscriptions</li>
          <li>Ensure security and prevent abuse</li>
        </ul>

        <h2>3. AI Processing Disclaimer</h2>
        <p>
          Uploaded documents may be processed using machine learning models such
          as OpenAI or similar technologies. AI results may contain inaccuracies
          and should be reviewed by qualified personnel. We do not use your
          documents for AI model training unless explicitly permitted by you.
        </p>

        <h2>4. Legal Basis for Processing (GDPR-Friendly)</h2>
        <p>Where applicable, we process personal data under the following bases:</p>
        <ul>
          <li>Performance of a contract</li>
          <li>Legitimate business interests</li>
          <li>User consent</li>
          <li>Compliance with legal obligations</li>
        </ul>

        <h2>5. Sharing Your Information</h2>
        <p>We do not sell personal data. We may share information with:</p>
        <ul>
          <li>Supabase (authentication & database)</li>
          <li>Stripe (payment processing)</li>
          <li>OpenAI (AI document extraction)</li>
          <li>Resend or email providers (notifications)</li>
          <li>Authorized organizational users within your account</li>
          <li>Service providers under contractual confidentiality</li>
        </ul>

        <h2>6. Data Retention</h2>
        <p>
          We retain data as long as necessary to provide the Service, comply
          with legal obligations, resolve disputes, and enforce agreements.
        </p>

        <h2>7. Security</h2>
        <p>
          We implement administrative, technical, and physical safeguards to
          protect information. While we strive to secure data, no system is
          completely immune from risk.
        </p>

        <h2>8. Your Rights</h2>
        <p>Depending on your location, you may have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Correct inaccurate information</li>
          <li>Request deletion (“Right to be Forgotten”)</li>
          <li>Object to processing</li>
          <li>Receive a copy of your data</li>
        </ul>

        <h2>9. Cookies & Tracking</h2>
        <p>
          We may use cookies, analytics tools, and similar technologies to
          improve Services and user experience. You may control cookies through
          your browser.
        </p>

        <h2>10. International Data Transfers</h2>
        <p>
          Your data may be processed in the United States or other jurisdictions
          where our service providers operate. We use reasonable safeguards to
          ensure lawful cross-border data transfers.
        </p>

        <h2>11. Children’s Privacy</h2>
        <p>
          The Service is not intended for individuals under 18. We do not
          knowingly collect data from children.
        </p>

        <h2>12. Third-Party Links</h2>
        <p>
          The Service may contain links to third-party sites; we are not
          responsible for their content or privacy practices.
        </p>

        <h2>13. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy periodically. Continued use of the
          Service after changes signifies acceptance.
        </p>

        <h2>14. Contact Us</h2>
        <p>
          For questions about privacy or data handling, contact us at:
          <br />
          <strong>support@yourdomain.com</strong>
        </p>
      </div>
    </div>
  );
}
