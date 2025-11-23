// components/documents/DocumentViewerV3.js
import { useState, useMemo } from "react";
import ModalV3 from "../modals/ModalV3";

export default function DocumentViewerV3({
  open,
  onClose,
  fileUrl,
  title = "Certificate of Insurance",
  extracted,
}) {
  const [zoom, setZoom] = useState(1);

  const safeUrl = useMemo(() => {
    if (!fileUrl) return null;
    return fileUrl;
  }, [fileUrl]);

  const shellStyle = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)",
    gap: 18,
    height: "100%",
    minHeight: 0,
  };

  const leftStyle = {
    position: "relative",
    borderRadius: "22px",
    overflow: "hidden",
    background:
      "radial-gradient(circle at top left, rgba(15,23,42,0.9), rgba(15,23,42,1))",
    boxShadow:
      "0 24px 80px rgba(15,23,42,0.85), 0 0 0 1px rgba(30,64,175,0.55)",
    display: "flex",
    flexDirection: "column",
  };

  const toolbarStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    borderBottom: "1px solid rgba(30,64,175,0.65)",
    background:
      "linear-gradient(90deg, rgba(15,23,42,0.98), rgba(15,23,42,0.92))",
  };

  const zoomButtonStyle = {
    border: "none",
    borderRadius: "999px",
    padding: "4px 9px",
    fontSize: 12,
    cursor: "pointer",
    background:
      "radial-gradient(circle at top left, rgba(248,250,252,0.12), rgba(31,41,55,0.95))",
    color: "#e5e7eb",
  };

  const pdfShellStyle = {
    flex: 1,
    minHeight: 0,
    overflow: "auto",
    padding: 14,
    background:
      "radial-gradient(circle at top, rgba(15,23,42,1), rgba(15,23,42,0.96))",
  };

  const pdfInnerStyle = {
    transform: `scale(${zoom})`,
    transformOrigin: "top center",
    transition: "transform 0.18s ease-out",
    display: "flex",
    justifyContent: "center",
  };

  const iframeStyle = {
    width: "100%",
    maxWidth: 900,
    height: "calc(100vh - 220px)",
    borderRadius: "14px",
    border: "1px solid rgba(148,163,184,0.7)",
    backgroundColor: "#020617",
  };

  function changeZoom(delta) {
    setZoom((z) => {
      const next = Math.min(1.6, Math.max(0.6, z + delta));
      return Number(next.toFixed(2));
    });
  }

  const rightStyle = {
    borderRadius: "22px",
    padding: "16px 18px",
    background:
      "radial-gradient(circle at top left, rgba(30,64,175,0.7), rgba(15,23,42,1))",
    boxShadow:
      "0 24px 80px rgba(15,23,42,0.85), 0 0 0 1px rgba(148,163,184,0.45)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    color: "#e5e7eb",
    fontSize: 13,
  };

  const summaryCardStyle = {
    borderRadius: "16px",
    padding: "10px 12px",
    background:
      "radial-gradient(circle at top left, rgba(15,23,42,0.9), rgba(15,23,42,1))",
    border: "1px solid rgba(148,163,184,0.35)",
  };

  const summaryRowStyle = {
    display: "grid",
    gridTemplateColumns: "120px minmax(0, 1fr)",
    gap: 8,
    alignItems: "baseline",
    fontSize: 12,
    marginBottom: 4,
  };

  const labelStyle = {
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: "0.08em",
    color: "#9ca3af",
  };

  const valueStyle = {
    color: "#e5e7eb",
  };

  const flags =
    extracted?.flags ||
    extracted?.missingFields ||
    extracted?.issues ||
    [];

  return (
    <ModalV3 open={open} onClose={onClose} title="DOCUMENT VIEWER V3">
      <div style={shellStyle}>
        {/* LEFT SIDE — PDF VIEWER */}
        <div style={leftStyle}>
          <div style={toolbarStyle}>
            <div style={{ display: "flex", gap: 10, color: "#e5e7eb" }}>
              <button type="button" style={zoomButtonStyle} onClick={() => changeZoom(-0.1)}>
                –
              </button>
              <button type="button" style={zoomButtonStyle} onClick={() => changeZoom(+0.1)}>
                +
              </button>
            </div>
          </div>

          <div style={pdfShellStyle}>
            <div style={pdfInnerStyle}>
              {safeUrl ? (
                <iframe src={safeUrl} title="PDF" style={iframeStyle} />
              ) : (
                <div style={{
                  ...iframeStyle,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9ca3af",
                  borderStyle: "dashed",
                }}>
                  No PDF loaded
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE — SUMMARY */}
        <div style={rightStyle}>
          <div style={summaryCardStyle}>
            <div style={summaryRowStyle}>
              <div style={labelStyle}>Carrier</div>
              <div style={valueStyle}>{extracted?.carrier || "—"}</div>
            </div>
            <div style={summaryRowStyle}>
              <div style={labelStyle}>Policy #</div>
              <div style={valueStyle}>
                {extracted?.policy_number || "—"}
              </div>
            </div>
            <div style={summaryRowStyle}>
              <div style={labelStyle}>Coverage</div>
              <div style={valueStyle}>
                {extracted?.coverage_type || "—"}
              </div>
            </div>
            <div style={summaryRowStyle}>
              <div style={labelStyle}>Effective</div>
              <div style={valueStyle}>
                {extracted?.effective_date || "—"}
              </div>
            </div>
            <div style={summaryRowStyle}>
              <div style={labelStyle}>Expires</div>
              <div style={valueStyle}>
                {extracted?.expiration_date || "—"}
              </div>
            </div>
          </div>

          {flags.length > 0 && (
            <div style={summaryCardStyle}>
              <div style={labelStyle}>Flags</div>
              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {flags.map((f, i) => (
                  <span key={i} style={{
                    padding: "4px 8px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(148,163,184,0.35)",
                  }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalV3>
  );
}
