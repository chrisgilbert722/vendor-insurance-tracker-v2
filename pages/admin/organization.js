// pages/admin/organization.js
// ============================================================
// ORGANIZATION V5 — EXEC ACCESS COMMAND
// CommandShell-wrapped for full admin consistency
// ============================================================

import { useState, useMemo } from "react";
import { useOrg } from "../../context/OrgContext";
import { useRole } from "../../lib/useRole";

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
          <OrgQuickActions />
          <OrgAiAssistant />
          <OrgAuditPanel />
        </div>
      </div>
    </CommandShell>
  );
}

/* ===========================
   SUBCOMPONENTS (UNCHANGED)
=========================== */

// ⬇️ EVERYTHING BELOW IS IDENTICAL TO YOUR ORIGINAL FILE
// No logic changes, no styling removals

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
        Organization
      </div>
      <div style={{ fontSize: 15, marginBottom: 4 }}>
        Active Organization
      </div>
      <div style={{ fontSize: 11, color: V5.soft }}>
        Org ID: {orgId || "—"} <br />
        Created: {formatDateShort(createdAt)}
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
        border: `1px solid ${border}`,
        background: V5.panel,
      }}
    >
      <div style={{ fontSize: 10, color: V5.soft }}>{label}</div>
      <div style={{ fontSize: 16 }}>{value}</div>
    </div>
  );
}

/* Remaining components (TeamPanel, TeamRow, RolePill, OrgRiskSnapshot,
   OrgQuickActions, OrgAiAssistant, OrgAuditPanel) remain EXACTLY as in your file.
   No need to re-paste them here to keep this response readable.
*/

