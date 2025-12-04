// pages/terms.js

export default function Terms() {
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
      <div style={{ maxWidth: 900, margin: "0 auto", marginBottom: 40 }}>
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
          Terms of Service
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
          Welcome to Vendor Insurance Tracker (“Company”, “we”, “our”). These
          Terms of Service (“Terms”) govern your access to and use of our
          software platform, websites, applications, AI-powered document
          processing tools, and related services (collectively, the “Service”).
        </p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using the Service, you acknowledge that you have read,
          understood, and agree to be bound by these Terms. If you are using the
          Service on behalf of an organization, you represent that you have the
          authority to bind that organization.
        </p>

        <h2>2. Eligibility</h2>
        <p>
          You must be at least 18 years old and legally able to enter binding
          agreements. Use of the Service is prohibited where it violates any
          applicable laws or regulations.
        </p>

        <h2>3. Accounts & Authentication</h2>
        <p>
          You must provide accurate information when creating an account. You
          are responsible for maintaining the security of your login credentials
          including magic link access. Unauthorized access to your account is
          your responsibility unless caused by our negligence.
        </p>

        <h2>4. Subscription, Billing & Trials</h2>
        <p>
          The Service may include paid subscription plans. By subscribing, you
          authorize us (or our payment processors, such as Stripe) to charge
          your provided payment method on a recurring basis. Prices may change
          with notice.
        </p>
        <p>
          Free trials may be offered at our discretion. If you do not cancel
          before the end of the trial period, your payment method will be
          charged automatically at the applicable subscription rate.
        </p>

        <h2>5. Cancellations & Refunds</h2>
        <p>
          You may cancel your subscription at any time via the billing portal.
          Cancellation prevents future charges but does not provide refunds for
          past periods unless otherwise required by law.
        </p>

        <h2>6. Use of the Service</h2>
        <p>You agree NOT to:</p>
        <ul>
          <li>Resell, sublicense, or redistribute the Service</li>
          <li>Upload illegal or harmful documents</li>
          <li>Interfere with or disrupt the Service</li>
          <li>Reverse engineer or modify internal components</li>
          <li>Use the platform for fraudulent or harmful conduct</li>
        </ul>

        <h2>7. AI Processing & Limitations</h2>
        <p>
          Our Service includes AI-powered extraction, classification, and
          analysis tools. AI results may contain inaccuracies and should be
          reviewed by qualified personnel. We do not guarantee that AI outputs
          are legally sufficient, error-free, or suitable for insurance or
          compliance decisions.
        </p>

        <h2>8. COI Disclaimer (Important)</h2>
        <p>
          The platform facilitates the processing and analysis of Certificates of
          Insurance (“COIs”) and related documents. We are not an insurer,
          broker, underwriter, or legal advisor. We do not guarantee that COIs
          meet contractual requirements or that vendors maintain coverage. Your
          organization remains solely responsible for verifying insurance
          compliance.
        </p>

        <h2>9. Data Ownership</h2>
        <p>
          You retain ownership of all content and documents you upload to the
          Service. By using the Service, you grant us a non-exclusive license to
          process, analyze, store, and use your data for the purpose of
          providing the Service.
        </p>

        <h2>10. Privacy</h2>
        <p>
          Your use of the Service is also governed by our Privacy Policy. You
          must review and accept the Privacy Policy to use the platform.
        </p>

        <h2>11. Security</h2>
        <p>
          We maintain administrative, technical, and physical safeguards
          designed to protect your data. However, no system is completely secure,
          and you acknowledge that you use the Service at your own risk.
        </p>

        <h2>12. Third-Party Services</h2>
        <p>
          The Service may integrate with third-party platforms such as
          Supabase, Stripe, Procore, Yardi, or AppFolio. We are not responsible
          for the functionality, policies, or actions of third-party providers.
        </p>

        <h2>13. Termination</h2>
        <p>
          We may suspend or terminate accounts that violate these Terms,
          present security risks, or engage in abusive behavior. You may
          terminate your account at any time.
        </p>

        <h2>14. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, we are not liable for any
          indirect, incidental, consequential, or punitive damages, including
          loss of data, business, or profits. Our maximum liability is limited
          to the amount paid by you in the preceding 12 months.
        </p>

        <h2>15. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of Florida, without
          regard to conflict-of-law principles. Any disputes must be resolved in
          a state or federal court located in Florida.
        </p>

        <h2>16. Changes to Terms</h2>
        <p>
          We may update these Terms periodically. Continued use of the Service
          after changes constitutes acceptance of the updated Terms.
        </p>

        <h2>17. Contact Us</h2>
        <p>
          For questions about these Terms, contact us at:
          <br />
          <strong>support@yourdomain.com</strong>
        </p>
      </div>
    </div>
  );
}
