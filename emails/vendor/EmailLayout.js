// emails/vendor/EmailLayout.js
export default function EmailLayout({ children, org }) {
  return (
    <div
      style={{
        width: "100%",
        background: "#0f172a",
        padding: "30px 0",
        fontFamily: "Arial, sans-serif",
        color: "#e5e7eb",
      }}
    >
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          background: "#1e293b",
          borderRadius: 12,
          padding: "28px 26px",
          border: "1px solid #334155",
        }}
      >
        {/* HEADER */}
        <div style={{ marginBottom: 20 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              background: "linear-gradient(90deg,#38bdf8,#a855f7)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            {org?.name || "Vendor Compliance"}
          </h2>
        </div>

        {children}

        {/* FOOTER */}
        <div
          style={{
            marginTop: 28,
            fontSize: 12,
            opacity: 0.65,
            borderTop: "1px solid #334155",
            paddingTop: 14,
            textAlign: "center",
          }}
        >
          This message was sent by {org?.name || "your compliance team"}.
        </div>
      </div>
    </div>
  );
}
