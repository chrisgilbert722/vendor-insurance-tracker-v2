// pages/compare/jones.js
import Head from "next/head";
import Link from "next/link";

export default function CompareJones() {
  return (
    <>
      <Head>
        <title>Jones Alternative for Property Managers</title>
        <meta
          name="description"
          content="Compare Jones vs a control-first vendor risk intelligence platform for property managers."
        />
      </Head>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "120px 24px" }}>
        <h1 style={{ fontSize: 48, fontWeight: 900, marginBottom: 24 }}>
          Jones vs Control-First Vendor Risk Intelligence
        </h1>

        <p style={{ fontSize: 20, color: "#334155", maxWidth: 820 }}>
          Jones focuses heavily on vendor onboarding and enforcement. This
          platform prioritizes visibility and risk understanding first.
        </p>

        <section style={{ marginTop: 64 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>
            Key differences
          </h2>
          <ul style={{ fontSize: 18, color: "#475569", lineHeight: 1.8 }}>
            <li>Jones emphasizes vendor compliance enforcement</li>
            <li>This platform emphasizes owner risk visibility</li>
            <li>Jones workflows are sales-assisted</li>
            <li>This platform is fully self-serve</li>
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
