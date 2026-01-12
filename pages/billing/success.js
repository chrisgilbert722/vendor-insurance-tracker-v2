import { useEffect } from "react";
import { useRouter } from "next/router";

export default function BillingSuccess() {
  const router = useRouter();

  useEffect(() => {
    // Small delay to allow Stripe + DB writes to settle
    const t = setTimeout(() => {
      router.replace("/dashboard");
    }, 800);

    return () => clearTimeout(t);
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top,#020617 0%,#000 60%)",
        color: "#e5e7eb",
        fontSize: 16,
      }}
    >
      Finalizing your subscription…
    </div>
  );
}
