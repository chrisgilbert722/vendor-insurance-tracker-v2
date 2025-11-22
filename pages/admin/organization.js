// pages/admin/organization.js
import { useState, useMemo } from "react";
import { useOrg } from "../../context/OrgContext";
import { useRole } from "../../lib/useRole";

/* ===========================
   MOCK DATA (replace later)
=========================== */

const initialTeam = [
  {
    id: "u-1",
    email: "you@example.com",
    name: "You (Owner)",
    role: "Admin",
    status: "Active",
    lastActive: "2025-11-20T09:30:00Z",
  },
  {
    id: "u-2",
    email: "ops@example.com",
    name: "Ops Manager",
    role: "Manager",
    status: "Active",
    lastActive: "2025-11-19T14:10:00Z",
  },
];

const roleOptions = ["Admin", "Manager", "Viewer"];

/* ===========================
   HELPERS
=========================== */

function formatDateShort(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelative(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = diffMs / 60000;
  if (mins < 1) return "just now";
  if (mins < 60) return `${Math.round(mins)}m ago`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = hours / 24;
  return `${Math.round(days)}d ago`;
}

/* ===========================
   MAIN PAGE — ORGANIZATION V3
=========================== */

export default function OrganizationPage() {
  const { orgId } = useOrg();
  const { isAdmin, isManager } = useRole();
  const canInvite = isAdmin || isManager;

  const [team, setTeam] = useState(initialTeam);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Viewer");
  const [note, setNote] = useState("");

  const stats = useMemo(() => {
    const total = team.length;
    const admins = team.filter((m) => m.role === "Admin").length;
    const managers = team.filter((m) => m.role === "Manager").length;
    const viewers = team.filter((m) => m.role === "Viewer").length;
    return { total, admins, managers, viewers };
  }, [team]);

  function handleInvite(e) {
    e.preventDefault();
    const trimmed = inviteEmail.trim();
    if (!trimmed) return;

    const newMember = {
      id: `u-${Date.now()}`,
      email: trimmed,
      name: trimmed,
      role: inviteRole,
      status: "Pending",
      lastActive: null,
    };

    setTeam((prev) => [...prev, newMember]);
    setInviteEmail("");
    setInviteRole("Viewer");
    setNote("Invite created locally (mock). Wire this to your real API later.");
  }

  function handleRoleChange(id, newRole) {
    setTeam((prev) =>
      prev.map((m) => (m.id === id ? { ...m, role: newRole } : m))
    );
  }

  function handleRemove(id) {
    if (!window.confirm("Remove this team member from the org?")) return;
    setTeam((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(circle at top left,#020617 0%,#020617 40%,#000 100%)",
        padding: "30px 40px 40px",
        color: "#e5e7eb",
        overflowX: "hidden",
      }}
    >
      {/* AURA */}
      <div
        style={{
          position: "absolute",
          top: -260,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1100,
          height: 1100,
          background:
            "radial-gradient(circle, rgba(56,189,248,0.35), transparent 60%)",
          filter: "blur(120px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* HEADER */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              padding: 12,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 30% 0,#38bdf8,#0ea5e9,#1e3a8a)",
              boxShadow: "0 0 45px rgba(56,189,248,0.7)",
            }}
          >
            <span style={{ fontSize: 22 }}>🏢</span>
          </div>

          <div>
            <div
              style={{
                display: "inline-flex",
                gap: 8,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.4)",
                background:
                  "linear-gradient(120deg,rgba(15,23,42,0.9),rgba(15,23,42,0))",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "#9ca3af",
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                }}
              >
                Organization · Team Settings V3
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#38bdf8",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Access · Roles · Visibility
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: 0.2,
              }}
            >
              One cockpit for{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg,#38bdf8,#a5b4fc,#e5e7eb)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                your entire risk team
              </span>
              .
            </h1>

            <p
              style={{
                marginTop: 6,
                marginBottom: 0,
                fontSize: 13,
                color: "#cbd5f5",
                maxWidth: 640,
              }}
            >
              Control who sees vendor risk, who can edit rules & requirements,
              and who can resolve alerts — with the same cinematic cockpit feel
              as your Alerts dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "minmax(0,2.1fr) minmax(0,1.4fr)",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        {/* LEFT — ORG + TEAM */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <OrgSummaryPanel orgId={orgId} stats={stats} />
          <TeamPanel
            team={team}
            canInvite={canInvite}
            inviteEmail={inviteEmail}
            inviteRole={inviteRole}
            setInviteEmail={setInviteEmail}
            setInviteRole={setInviteRole}
            onInvite={handleInvite}
            onRoleChange={handleRoleChange}
            onRemove={handleRemove}
            note={note}
          />
        </div>

        {/* RIGHT — SNAPSHOT + ACTIONS + AI + AUDIT */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <OrgRiskSnapshot stats={stats} />
          <OrgQuickActions />
          <OrgAiAssistant />
          <OrgAuditPanel />
        </div>
      </div>
    </div>
  );
}

/* ===========================
   ORG SUMMARY PANEL
=========================== */

function OrgSummaryPanel({ orgId, stats }) {
  const createdAt = "2025-11-17T13:59:20Z";

  return (
    <div
      style={{
        borderRadius: 24,
        padding: 16,
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.97),rgba(15,23,42,0.92))",
        border: "1px solid rgba(148,163,184,0.6)",
        boxShadow:
          "0 24px 60px rgba(15,23,42,0.98), 0 0 30px rgba(56,189,248,0.22)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 18,
          marginBottom: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: "#9ca3af",
              marginBottom: 4,
            }}
          >
            Organization
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "#e5e7eb",
              marginBottom: 4,
            }}
          >
            Active Organization
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>
            Org ID:{" "}
            <span style={{ color: "#e5e7eb" }}>
              {orgId || "Org context loaded"}
            </span>
            <br />
            Created:{" "}
            <span style={{ color: "#e5e7eb" }}>
              {formatDateShort(createdAt)}
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,minmax(0,1fr))",
            gap: 8,
            minWidth: 230,
          }}
        >
          <MiniStat label="Total members" value={stats.total} tone="neutral" />
          <MiniStat label="Admins" value={stats.admins} tone="hot" />
          <MiniStat label="Managers" value={stats.managers} tone="warm" />
        </div>
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 10,
          color: "#6b7280",
        }}
      >
        This org controls which team members can view vendor risk, edit rules,
        invite others, and change automation settings.
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  const palette = {
    neutral: {
      border: "rgba(148,163,184,0.8)",
      bg: "rgba(15,23,42,0.95)",
    },
    hot: {
      border: "rgba(248,113,113,0.85)",
      bg: "rgba(127,29,29,0.95)",
    },
    warm: {
      border: "rgba(250,204,21,0.85)",
      bg: "rgba(113,63,18,0.95)",
    },
  }[tone];

  return (
    <div
      style={{
        borderRadius: 16,
        padding: "8px 10px",
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        boxShadow: "0 14px 35px rgba(15,23,42,0.9)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "#9ca3af",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "#e5e7eb",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ===========================
   TEAM PANEL
=========================== */

function TeamPanel({
  team,
  canInvite,
  inviteEmail,
  inviteRole,
  setInviteEmail,
  setInviteRole,
  onInvite,
  onRoleChange,
  onRemove,
  note,
}) {
  return (
    <div
      style={{
        borderRadius: 24,
        padding: 16,
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.97),rgba(15,23,42,0.92))",
        border: "1px solid rgba(148,163,184,0.6)",
        boxShadow:
          "0 24px 60px rgba(15,23,42,0.98), 0 0 35px rgba(56,189,248,0.12)",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: "#9ca3af",
              marginBottom: 4,
            }}
          >
            Team members
          </div>
          <div style={{ fontSize: 13, color: "#e5e7eb" }}>
            Control who can view risk, edit rules, and resolve alerts.
          </div>
        </div>

        <div
          style={{
            fontSize: 11,
            color: "#9ca3af",
            textAlign: "right",
          }}
        >
          {canInvite
            ? "You can invite new teammates."
            : "You are in read-only mode here."}
        </div>
      </div>

      {/* INVITE FORM */}
      <form
        onSubmit={onInvite}
        style={{
          borderRadius: 18,
          padding: 12,
          border: "1px solid rgba(51,65,85,0.9)",
          background:
            "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,1))",
          marginBottom: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 200 }}>
            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
                marginBottom: 4,
              }}
            >
              Invite by email
            </div>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@example.com"
              disabled={!canInvite}
              style={{
                width: "100%",
                borderRadius: 999,
                padding: "7px 10px",
                border: "1px solid rgba(51,65,85,0.9)",
                background: "rgba(15,23,42,0.98)",
                color: "#e5e7eb",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

          <div style={{ minWidth: 140 }}>
            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
                marginBottom: 4,
              }}
            >
              Role
            </div>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              disabled={!canInvite}
              style={{
                width: "100%",
                borderRadius: 999,
                padding: "7px 10px",
                border: "1px solid rgba(51,65,85,0.9)",
                background: "rgba(15,23,42,0.98)",
                color: "#e5e7eb",
                fontSize: 13,
                outline: "none",
              }}
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
            }}
          >
            <button
              type="submit"
              disabled={!canInvite}
              style={{
                borderRadius: 999,
                padding: "8px 14px",
                border: "1px solid rgba(56,189,248,0.9)",
                background:
                  "radial-gradient(circle at top left,#38bdf8,#0ea5e9,#0369a1)",
                color: "#ecfeff",
                fontSize: 12,
                fontWeight: 500,
                cursor: canInvite ? "pointer" : "not-allowed",
                opacity: canInvite ? 1 : 0.5,
              }}
            >
              Send invite
            </button>
          </div>
        </div>

        {note && (
          <div
            style={{
              fontSize: 10,
              color: "#6b7280",
            }}
          >
            {note}
          </div>
        )}
      </form>

      {/* TEAM LIST */}
      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(51,65,85,0.9)",
          background:
            "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,1))",
          padding: 10,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {team.map((member) => (
          <TeamRow
            key={member.id}
            member={member}
            canEdit={canInvite}
            onRoleChange={onRoleChange}
            onRemove={onRemove}
          />
        ))}

        {team.length === 0 && (
          <div
            style={{
              fontSize: 12,
              color: "#9ca3af",
              padding: 8,
            }}
          >
            No team members yet. Invite at least one teammate so you&apos;re
            not the only one seeing vendor risk.
          </div>
        )}
      </div>
    </div>
  );
}

function TeamRow({ member, canEdit, onRoleChange, onRemove }) {
  return (
    <div
      style={{
        borderRadius: 14,
        padding: "8px 10px",
        background:
          "linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.98))",
        border: "1px solid rgba(55,65,81,0.95)",
        boxShadow: "0 16px 40px rgba(15,23,42,0.95)",
        display: "grid",
        gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1.1fr) auto",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 13,
            color: "#e5e7eb",
          }}
        >
          {member.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#9ca3af",
          }}
        >
          {member.email}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <RolePill role={member.role} />
        <div
          style={{
            fontSize: 10,
            color: "#6b7280",
          }}
        >
          {member.status === "Active"
            ? `Active · last seen ${formatRelative(member.lastActive)}`
            : "Pending invite"}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <select
          value={member.role}
          onChange={(e) => onRoleChange(member.id, e.target.value)}
          disabled={!canEdit}
          style={{
            borderRadius: 999,
            padding: "4px 8px",
            border: "1px solid rgba(51,65,85,0.9)",
            background: "rgba(15,23,42,0.98)",
            color: "#e5e7eb",
            fontSize: 11,
            outline: "none",
          }}
        >
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <button
          onClick={() => onRemove(member.id)}
          disabled={!canEdit}
          style={{
            borderRadius: 999,
            padding: "3px 8px",
            border: "1px solid rgba(248,113,113,0.8)",
            background: "rgba(127,29,29,0.95)",
            color: "#fecaca",
            fontSize: 10,
            cursor: canEdit ? "pointer" : "not-allowed",
            opacity: canEdit ? 1 : 0.5,
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function RolePill({ role }) {
  let bg, text, border;
  if (role === "Admin") {
    bg = "rgba(248,113,113,0.12)";
    border = "rgba(248,113,113,0.85)";
    text = "#fecaca";
  } else if (role === "Manager") {
    bg = "rgba(250,204,21,0.12)";
    border = "rgba(250,204,21,0.85)";
    text = "#fef9c3";
  } else {
    bg = "rgba(56,189,248,0.12)";
    border = "rgba(56,189,248,0.85)";
    text = "#e0f2fe";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px",
        borderRadius: 999,
        background: bg,
        border: `1px solid ${border}`,
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        color: text,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: border,
          boxShadow: `0 0 10px ${border}`,
        }}
      />
      {role}
    </span>
  );
}

/* ===========================
   ORG RISK SNAPSHOT
=========================== */

function OrgRiskSnapshot({ stats }) {
  const score = Math.min(100, 40 + stats.admins * 10 + stats.managers * 6);

  return (
    <div
      style={{
        borderRadius: 24,
        padding: 16,
        background:
          "radial-gradient(circle at top right,rgba(15,23,42,0.96),rgba(15,23,42,1))",
        border: "1px solid rgba(148,163,184,0.6)",
        boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 1.2,
          color: "#9ca3af",
          marginBottom: 6,
        }}
      >
        Org access snapshot
      </div>

      <div
        style={{
          fontSize: 13,
          color: "#e5e7eb",
          marginBottom: 8,
        }}
      >
        {stats.total} team members · {stats.admins} admins · {stats.managers}{" "}
        managers
      </div>

      {/* Gauge bar */}
      <div
        style={{
          height: 8,
          width: "100%",
          borderRadius: 999,
          overflow: "hidden",
          background: "#020617",
          border: "1px solid rgba(30,64,175,0.9)",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            background:
              "linear-gradient(90deg,#22c55e,#eab308,#fb7185,#ef4444)",
          }}
        />
      </div>

      <div
        style={{
          fontSize: 10,
          color: "#6b7280",
        }}
      >
        Keep admin count tight. Too many admins increases risk. Managers +
        viewers are safer for most workflows.
      </div>
    </div>
  );
}

/* ===========================
   ORG QUICK ACTIONS
=========================== */

function OrgQuickActions() {
  return (
    <div
      style={{
        borderRadius: 24,
        padding: 16,
        background:
          "radial-gradient(circle at top right,rgba(15,23,42,0.96),rgba(15,23,42,1))",
        border: "1px solid rgba(148,163,184,0.6)",
        boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 1.2,
          color: "#9ca3af",
          marginBottom: 6,
        }}
      >
        Quick org actions
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2,minmax(0,1fr))",
          gap: 10,
        }}
      >
        <QuickActionCard
          label="Export team access"
          description="Generate a CSV of all team members, their roles, and last active timestamps."
        />
        <QuickActionCard
          label="Review rule change history"
          description="See which admins changed rules or requirements in the last 30 days."
        />
        <QuickActionCard
          label="Set up SSO"
          description="Integrate with your identity provider to manage access centrally."
        />
        <QuickActionCard
          label="Lock org settings"
          description="Restrict org-level changes to a smaller set of administrators."
        />
      </div>
    </div>
  );
}

function QuickActionCard({ label, description }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 10,
        border: "1px solid rgba(55,65,81,0.9)",
        background: "rgba(15,23,42,0.98)",
        fontSize: 11,
      }}
    >
      <div
        style={{
          color: "#e5e7eb",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "#9ca3af",
        }}
      >
        {description}
      </div>
    </div>
  );
}

/* ===========================
   ORG AI ASSISTANT TEASER
=========================== */

function OrgAiAssistant() {
  return (
    <div
      style={{
        borderRadius: 24,
        padding: 16,
        background:
          "radial-gradient(circle at top right,rgba(15,23,42,0.96),rgba(15,23,42,1))",
        border: "1px solid rgba(56,189,248,0.8)",
        boxShadow: "0 24px 60px rgba(8,47,73,0.9)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            background:
              "radial-gradient(circle at 30% 0,#38bdf8,#4f46e5,#020617)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 20px rgba(56,189,248,0.9)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 18 }}>✨</span>
        </div>

        <div>
          <div
            style={{
              fontSize: 13,
              color: "#e5e7eb",
              marginBottom: 4,
            }}
          >
            Coming soon: AI access tuning for your org.
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginBottom: 6,
            }}
          >
            The AI assistant will suggest who should be Admin, Manager, or
            Viewer based on how they interact with vendor risk, COIs,
            endorsements, and alerts.
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#6b7280",
            }}
          >
            For now this panel is a mock. When wired, it will analyze your
            audit logs and usage patterns to propose safer access defaults.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===========================
   ORG AUDIT PANEL (MOCK)
=========================== */

function OrgAuditPanel() {
  const mockEvents = [
    {
      id: "e-1",
      actor: "You (Owner)",
      action: "Changed Ops Manager role from Viewer → Manager",
      at: "2025-11-19T16:10:00Z",
    },
    {
      id: "e-2",
      actor: "You (Owner)",
      action: "Invited ops@example.com as Manager",
      at: "2025-11-18T09:45:00Z",
    },
  ];

  return (
    <div
      style={{
        borderRadius: 24,
        padding: 16,
        background:
          "radial-gradient(circle at top right,rgba(15,23,42,0.96),rgba(15,23,42,1))",
        border: "1px solid rgba(148,163,184,0.6)",
        boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 1.2,
          color: "#9ca3af",
          marginBottom: 6,
        }}
      >
        Recent org access changes
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {mockEvents.map((ev, idx) => (
          <div
            key={ev.id}
            style={{
              borderRadius: 14,
              padding: "7px 9px",
              border: "1px solid rgba(55,65,81,0.9)",
              background:
                "linear-gradient(90deg,rgba(15,23,42,0.98),rgba(15,23,42,0.95))",
              display: "grid",
              gridTemplateColumns: "16px minmax(0,1fr)",
              gap: 8,
              fontSize: 11,
              color: "#e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginTop: 3,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: idx === 0 ? "#38bdf8" : "#6b7280",
                  boxShadow:
                    idx === 0 ? "0 0 10px rgba(56,189,248,0.9)" : "none",
                  marginBottom: 4,
                }}
              />
            </div>

            <div>
              <div>{ev.action}</div>
              <div
                style={{
                  fontSize: 10,
                  color: "#9ca3af",
                  marginTop: 2,
                }}
              >
                {ev.actor} · {formatRelative(ev.at)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          fontSize: 10,
          color: "#6b7280",
          marginTop: 6,
        }}
      >
        When wired, this will pull from your real org audit log so you can see
        who changed what, and when.
      </div>
    </div>
  );
}

/* ===========================
   END OF FILE — SAFE CLOSE
=========================== */

// OrganizationPage is the default export.
// All subcomponents are defined above.
//
// File ends here.
//
