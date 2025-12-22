// pages/compare/trustlayer.js
import Head from "next/head";
import Link from "next/link";

export default function CompareTrustLayer() {
  return (
    <>
      <Head>
        <title>TrustLayer Alternative for Property Managers</title>
        <meta
          name="description"
          content="Compare TrustLayer vs a control-first vendor risk intelligence platform built for property managers. See differences in automation, visibility, and setup."
        />
      </Head>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "120px 24px" }}>
        <h1 style={{ fontSize: 48, fontWeight: 900, marginBottom: 24 }}>
          TrustLayer vs Control-First Vendor Risk Intelligence
        </h1>

        <p style={{ fontSize: 20, color: "#334155", maxWidth: 820 }}>
          TrustLayer is a well-known insurance compliance tool. This platform
          takes a different approach: showing vendor risk first, then automating
          only after you approve.
        </p>

        <section style={{ marginTop: 64 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>
            Key differences
          </h2>
          <ul style={{ fontSize: 18, color: "#475569", lineHeight: 1.8 }}>
            <li>TrustLayer is demo-led and automation-first</li>
            <li>This platform is self-serve and visibility-first</li>
            <li>TrustLayer begins vendor enforcement immediately</li>
            <li>This platform lets you preview everything before anything runs</li>
          </ul>
        </section>

        <section style={{ marginTop: 64 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>
            Which works better for property managers?
          </h2>
          <p style={{ fontSize: 18, color: "#475569", maxWidth: 820 }}>
            Property managers responsible for owner exposure typically prefer
            control and clarity before enforcement. That’s where a
            visibility-first platform is designed to win.
          </p>
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
