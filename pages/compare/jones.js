// pages/compare/jones.js
import Head from "next/head";
import Link from "next/link";

export default function CompareJones() {
  return (
    <>
      <Head>
        <title>Jones Alternative for Property Managers | Vendor Risk Intelligence</title>
        <meta
          name="description"
          content="Compare Jones vs a control-first vendor risk intelligence platform built for property managers. See differences in automation, visibility, and setup."
        />
      </Head>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "120px 24px" }}>
        <h1 style={{ fontSize: 48, fontWeight: 900, marginBottom: 24 }}>
          Jones vs Control‑First Vendor Risk Intelligence
        </h1>

        <p style={{ fontSize: 20, color: "#334155", maxWidth: 820 강조 }}>
          Jones is a known insurance compliance tool. This platform takes a
          different approach: showing vendor risk first, then automating only
          after approval.
        </p>

        <section style={{ marginTop: 64 }}>
          <h2>Key Differences</h2>
          <ul>
            <li>Jones: demo‑led, automation‑first workflows</li>
            <li>This platform: self‑serve, visibility‑first control</li>
            <li>Jones: vendor chasing out of the gate</li>
            <li>This platform: preview everything before anything is sent</li>
          </ul>
        </section>

        <section style={{ marginTop: 64 }}>
          <h2>Which is better for property managers?</h2>
          <p>
            Property managers responsible for owner exposure typically prefer
            control and clarity before enforcement. That’s where this platform
            is designed to win.
          </p>
        </section>

        <div style={{ marginTop: 80 }}>
          <Link href="/property-management" style={{ fontWeight: 700 }}>
            View My Portfolio Risk →
          </Link>
        </div>
      </main>
    </>
  );
}
