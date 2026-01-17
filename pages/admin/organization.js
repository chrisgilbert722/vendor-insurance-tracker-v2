// pages/admin/organization.js
// ============================================================
// ORGANIZATION V5 — EXEC ACCESS COMMAND
// CommandShell-wrapped for full admin consistency
// FIX: Restores missing components (TeamPanel, OrgRiskSnapshot, etc.)
// ============================================================

import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useOrg } from "../../context/OrgContext";

import CommandShell from "../../components/v5/CommandShell";
import { V5 } from "../../components/v5/v5Theme";

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
   MAIN PAGE — ORGANIZATION V5
=========================== */

export default function OrganizationPage() {
  // NOTE: Your OrgContext previously used activeOrgId elsewhere.
  // Keeping orgId here since this is what you pasted; we fallback safely.
  const orgCtx = useOrg();
  const orgId = orgCtx?.orgId || orgCtx?.activeOrgId || null;

  // V1: Full editing enabled for all authenticated users
  // Role-based restrictions will be added in V2 with proper org_members wiring
  const canInvite = true;

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
    <CommandShell
      tag="EXEC ACCESS • ORG COMMAND"
      title="Organization & Team Access"
      subtitle="Control who can view risk, edit rules, and resolve alerts across your org"
      status="ONLINE"
      statusColor={V5.green}
    >
      {/* MAIN GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,2.1fr) minmax(0,1.4fr)",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <OrgRiskSnapshot stats={stats} />
          <OrgQuickActions team={team} />
          <OrgAiAssistant />
          <OrgAuditPanel />
        </div>
      </div>
    </CommandShell>
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
        background: V5.panel,
        border: `1px solid ${V5.border}`,
        boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
      }}
    >
      <div style={{ fontSize: 11, color: V5.soft, marginBottom: 6 }}>
        ORGANIZATION
      </div>

      <div style={{ fontSize: 15, marginBottom: 4, fontWeight: 800 }}>
        Active Organization
      </div>

      <div style={{ fontSize: 11, color: V5.soft }}>
        Org ID: <span style={{ color: V5.text }}>{orgId || "—"}</span>
        <br />
        Created: <span style={{ color: V5.text }}>{formatDateShort(createdAt)}</span>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(3,minmax(0,1fr))",
          gap: 8,
        }}
      >
        <MiniStat label="Members" value={stats.total} />
        <MiniStat label="Admins" value={stats.admins} tone="hot" />
        <MiniStat label="Managers" value={stats.managers} tone="warm" />
      </div>

      <div style={{ marginTop: 10, fontSize: 10, color: V5.muted }}>
        This org controls who can view risk, edit rules, invite teammates, and manage escalation settings.
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  const map = {
    neutral: V5.border,
    hot: V5.red,
    warm: V5.yellow,
  };
  const border = map[tone] || V5.border;

  return (
    <div
      style={{
        borderRadius: 16,
        padding: "8px 10px",
        border: `1px solid ${border}99`,
        background: "rgba(2,6,23,0.45)",
        boxShadow: "inset 0 0 18px rgba(0,0,0,0.55)",
      }}
    >
      <div style={{ fontSize: 10, color: V5.soft, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 900, color: V5.text }}>
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
        background: V5.panel,
        border: `1px solid ${V5.border}`,
        boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: V5.soft, letterSpacing: "0.14em" }}>
            TEAM MEMBERS
          </div>
          <div style={{ fontSize: 13, color: V5.text }}>
            Control who can view risk, edit rules, and resolve alerts.
          </div>
        </div>
        <div style={{ fontSize: 11, color: V5.green, textAlign: "right" }}>
          Editing enabled
        </div>
      </div>

      {/* INVITE FORM */}
      <form
        onSubmit={onInvite}
        style={{
          borderRadius: 18,
          padding: 12,
          border: `1px solid ${V5.border}`,
          background: "rgba(2,6,23,0.45)",
          marginBottom: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 11, color: V5.soft, marginBottom: 4 }}>
              Invite by email
            </div>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@example.com"
              disabled={!canInvite}
              aria-label="Email address to invite"
              style={{
                width: "100%",
                borderRadius: 999,
                padding: "8px 10px",
                border: `1px solid ${V5.border}`,
                background: "rgba(15,23,42,0.98)",
                color: V5.text,
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

          <div style={{ minWidth: 160 }}>
            <div style={{ fontSize: 11, color: V5.soft, marginBottom: 4 }}>
              Role
            </div>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              disabled={!canInvite}
              aria-label="Role for new team member"
              style={{
                width: "100%",
                borderRadius: 999,
                padding: "8px 10px",
                border: `1px solid ${V5.border}`,
                background: "rgba(15,23,42,0.98)",
                color: V5.text,
                fontSize: 13,
                outline: "none",
                cursor: canInvite ? "pointer" : "not-allowed",
              }}
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              type="submit"
              disabled={!canInvite}
              aria-label="Send team invite"
              style={{
                borderRadius: 999,
                padding: "9px 14px",
                border: `1px solid ${V5.blue}`,
                background: canInvite
                  ? `linear-gradient(90deg, ${V5.blue}, #0ea5e9)`
                  : "rgba(56,189,248,0.15)",
                color: "#ecfeff",
                fontSize: 12,
                fontWeight: 800,
                cursor: canInvite ? "pointer" : "not-allowed",
                opacity: canInvite ? 1 : 0.5,
              }}
            >
              Send invite
            </button>
          </div>
        </div>

        {note && <div style={{ fontSize: 10, color: V5.muted }}>{note}</div>}
      </form>

      {/* TEAM LIST */}
      <div
        style={{
          borderRadius: 18,
          border: `1px solid ${V5.border}`,
          background: "rgba(2,6,23,0.45)",
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
          <div style={{ fontSize: 12, color: V5.soft, padding: 8 }}>
            No team members yet.
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
        padding: "10px 12px",
        background: V5.panel,
        border: `1px solid ${V5.border}`,
        boxShadow: "inset 0 0 18px rgba(0,0,0,0.55)",
        display: "grid",
        gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1.1fr) auto",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: V5.text, fontWeight: 800 }}>
          {member.name}
        </div>
        <div style={{ fontSize: 11, color: V5.soft }}>{member.email}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <RolePill role={member.role} />
        <div style={{ fontSize: 10, color: V5.muted }}>
          {member.status === "Active"
            ? `Active · last seen ${formatRelative(member.lastActive)}`
            : "Pending invite"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <select
          value={member.role}
          onChange={(e) => onRoleChange(member.id, e.target.value)}
          disabled={!canEdit}
          aria-label={`Change role for ${member.name}`}
          style={{
            borderRadius: 999,
            padding: "6px 10px",
            border: `1px solid ${V5.border}`,
            background: "rgba(15,23,42,0.98)",
            color: V5.text,
            fontSize: 11,
            outline: "none",
            cursor: canEdit ? "pointer" : "not-allowed",
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
          aria-label={`Remove ${member.name} from organization`}
          style={{
            borderRadius: 999,
            padding: "6px 10px",
            border: `1px solid ${V5.red}`,
            background: "rgba(127,29,29,0.35)",
            color: "#fecaca",
            fontSize: 11,
            fontWeight: 800,
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
  let color = V5.blue;
  let bg = "rgba(56,189,248,0.10)";

  if (role === "Admin") {
    color = V5.red;
    bg = "rgba(251,113,133,0.10)";
  } else if (role === "Manager") {
    color = V5.yellow;
    bg = "rgba(250,204,21,0.10)";
  } else {
    color = V5.blue;
    bg = "rgba(56,189,248,0.10)";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 10px",
        borderRadius: 999,
        background: bg,
        border: `1px solid ${color}88`,
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color,
        fontWeight: 900,
        width: "fit-content",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: color,
          boxShadow: `0 0 10px ${color}`,
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
        background: V5.panel,
        border: `1px solid ${V5.border}`,
        boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
      }}
    >
      <div style={{ fontSize: 11, color: V5.soft, letterSpacing: "0.14em" }}>
        ORG ACCESS SNAPSHOT
      </div>

      <div style={{ fontSize: 13, color: V5.text, marginTop: 8 }}>
        {stats.total} team members · {stats.admins} admins · {stats.managers} managers
      </div>

      <div
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Organization access risk score: ${score} percent`}
        style={{
          height: 8,
          width: "100%",
          borderRadius: 999,
          overflow: "hidden",
          background: "rgba(2,6,23,0.65)",
          border: `1px solid ${V5.blue}66`,
          marginTop: 10,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${V5.green}, ${V5.yellow}, ${V5.red})`,
          }}
        />
      </div>

      <div style={{ fontSize: 10, color: V5.muted }}>
        Keep admin count tight. Too many admins increases risk.
      </div>
    </div>
  );
}

/* ===========================
   QUICK ORG ACTIONS
=========================== */

function OrgQuickActions({ team }) {
  const router = useRouter();

  function handleExportTeam() {
    if (!team || team.length === 0) {
      alert("No team members to export.");
      return;
    }
    const header = ["name", "email", "role", "status", "last_active"];
    const rows = team.map((m) => [
      m.name || "",
      m.email || "",
      m.role || "",
      m.status || "",
      m.lastActive || "",
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `team_access_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleAuditLog() {
    router.push("/admin/audit-log");
  }

  function handleSetupSSO() {
    router.push("/admin/security/sso");
  }

  function handleLockSettings() {
    alert("Lock org settings is not yet implemented. Coming soon.");
  }

  return (
    <div
      style={{
        borderRadius: 24,
        padding: 16,
        background: V5.panel,
        border: `1px solid ${V5.border}`,
        boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
      }}
    >
      <div style={{ fontSize: 11, color: V5.soft, letterSpacing: "0.14em" }}>
        QUICK ORG ACTIONS
      </div>

      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: "repeat(2,minmax(0,1fr))",
          gap: 10,
        }}
      >
        <QuickActionCard
          label="Export team access"
          description="Generate a CSV of members, roles, and last-active timestamps."
          onClick={handleExportTeam}
        />
        <QuickActionCard
          label="Review rule change history"
          description="See which admins changed rules or requirements recently."
          onClick={handleAuditLog}
        />
        <QuickActionCard
          label="Set up SSO"
          description="Integrate with your identity provider."
          onClick={handleSetupSSO}
        />
        <QuickActionCard
          label="Lock org settings"
          description="Restrict org-level changes to a smaller admin set."
          onClick={handleLockSettings}
        />
      </div>
    </div>
  );
}

function QuickActionCard({ label, description, onClick }) {
  const [hover, setHover] = useState(false);

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        borderRadius: 18,
        padding: 12,
        border: `1px solid ${hover ? V5.blue : V5.border}`,
        background: hover ? "rgba(56,189,248,0.08)" : "rgba(2,6,23,0.45)",
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      <div style={{ color: V5.text, fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: V5.soft, fontSize: 11, lineHeight: 1.45 }}>
        {description}
      </div>
    </div>
  );
}

/* ===========================
   ORG AI ASSISTANT
=========================== */

function OrgAiAssistant() {
  return (
    <div
      style={{
        borderRadius: 24,
        padding: 16,
        background: V5.panel,
        border: `1px solid ${V5.blue}88`,
        boxShadow: `0 0 30px ${V5.glowBlue}, inset 0 0 24px rgba(0,0,0,0.6)`,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>
        AI Access Tuning (Standby)
      </div>
      <div style={{ fontSize: 11, color: V5.soft, lineHeight: 1.55 }}>
        AI will recommend safer admin/manager/viewer assignments based on usage patterns, vendor risk actions, and incident behavior.
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
        background: V5.panel,
        border: `1px solid ${V5.border}`,
        boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
      }}
    >
      <div style={{ fontSize: 11, color: V5.soft, letterSpacing: "0.14em" }}>
        RECENT ORG ACCESS CHANGES
      </div>

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {mockEvents.map((ev) => (
          <div
            key={ev.id}
            style={{
              borderRadius: 16,
              padding: "10px 12px",
              border: `1px solid ${V5.border}`,
              background: "rgba(2,6,23,0.45)",
            }}
          >
            <div style={{ fontSize: 12, color: V5.text }}>{ev.action}</div>
            <div style={{ fontSize: 10, color: V5.soft, marginTop: 4 }}>
              {ev.actor} · {formatRelative(ev.at)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, color: V5.muted, marginTop: 10 }}>
        Wire this to your real org audit log later.
      </div>
    </div>
  );
}
