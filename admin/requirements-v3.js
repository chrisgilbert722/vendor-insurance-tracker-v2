<button
  onClick={() => fetch("/api/engine/run-v3", { method: "POST" })}
  style={{
    padding: "8px 14px",
    borderRadius: 999,
    background: "linear-gradient(120deg,#38bdf8,#0ea5e9)",
    color: "white",
    fontSize: 12,
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
  }}
>
  ⚡ Run Engine
</button>
