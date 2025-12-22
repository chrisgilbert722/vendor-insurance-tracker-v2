// pages/compare/mycoi.js
import Head from "next/head";
import Link from "next/link";

export default function CompareMyCOI() {
  return (
    <>
      <Head>
        <title>myCOI Alternative for Property Managers</title>
        <meta
          name="description"
          content="Compare myCOI vs a modern vendor risk intelligence platform for property management teams."
        />
      </Head>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "120px 24px" }}>
        <h1 style={{ fontSize: 48, fontWeight: 900, marginBottom: 24 }}>
          myCOI vs Control-First Vendor Risk Intelligence
        </h1>

        <p style={{ fontSize: 20, color: "#334155", maxWidth: 820 }}>
          myCOI is primarily a document collection and tracking tool. This
          platform is built to surface real vendor risk before automation.
        </p>

        <section style={{ marginTop: 64 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>
            Key differences
          </h2>
          <ul style={{ fontSize: 18, color: "#475569", lineHeight: 1.8 }}>
            <li>myCOI focuses on collecting COIs</li>
            <li>This platform focuses on interpreting risk</li>
            <li>myCOI relies on manual review</li>
            <li>This platform highlights exposure automatically</li>
          </ul>
        </section>

        <div style={{ marginTop: 80 }}>
          <Link href="/property-management" style={{ fontSize: 18, fontWeight: 800 }}>
            View My Portfolio Risk →
          </Link>
        </div>
      </main>
    </>
  );
}
