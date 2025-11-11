export default function Home() {
  return (
    <main className="min-h-screen bg-[#0B0E17] text-white">
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          Automate Certificate of Insurance Tracking in 10 Minutes
        </h1>
        <p className="text-gray-300 text-lg md:text-xl max-w-3xl mx-auto mb-8">
          40–60% less than legacy tools. AI extracts, validates, and reminds vendors — 
          so you stay compliant without the busywork.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a href="/upload-coi" className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold">
            Upload a COI
          </a>
          <a href="/dashboard" className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg font-semibold">
            View Dashboard
          </a>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-6 pb-20">
        {[
          { title: "Vendor Self-Upload", desc: "Share a secure link. No logins required." },
          { title: "AI Extraction", desc: "Carrier, policy #, dates — parsed instantly." },
          { title: "Auto Alerts", desc: "Email reminders 30/15/7 days pre-expiry." },
          { title: "Rule Engine", desc: "Define required coverages, limits, endorsements." },
          { title: "Audit Export", desc: "One-click CSV export for audits and renewals." },
          { title: "Simple Pricing", desc: "Transparent tiers; no vendor fees or hidden costs." }
        ].map((f) => (
          <div key={f.title} className="bg-[#141825] border border-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
            <p className="text-gray-300">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
