// pages/organization.js
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

export default function OrganizationPage() {
  const [org, setOrg] = useState(null);
  const [membership, setMembership] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteLink, setInviteLink] = useState("");

  useEffect(() => {
    async function init() {
      setError("");
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          window.location.href = "/auth/login";
          return;
        }

        const userId = session.user.id;
        const email = session.user.email;

        // Ensure org
        const res = await fetch("/api/org/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, email }),
        });

        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error);

        setOrg(data.organization);
        setMembership(data.membership);
        setCreated(data.created);

        // Load members
        setMembersLoading(true);
        const memRes = await fetch(
          `/api/org/members?orgId=${data.organization.id}`
        );
        const memData = await memRes.json();
        if (!memRes.ok || !memData.ok) throw new Error(memData.error);
        setMembers(memData.members || []);
      } catch (err) {
        console.error("Organization init error:", err);
        setError(err.message || "Failed to load organization.");
      } finally {
        setLoading(false);
        setMembersLoading(false);
      }
    }

    init();
  }, []);

  async function handleInvite(e) {
    e.preventDefault();
    if (!org) return;

    setInviteError("");
    setInviteLoading(true);
    setInviteLink("");

    try {
      const res = await fetch("/api/org/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: org.id,
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error);

      setInviteLink(data.invite.acceptUrl);
      setInviteEmail("");
      setInviteRole("member");
    } catch (err) {
      console.error("Invite error:", err);
      setInviteError(err.message || "Failed to send invite.");
    } finally {
      setInviteLoading(false);
    }
  }

  function copyLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#e5e7eb",
        padding: "30px 40px",
      }}
    >
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        <p
          style={{
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "#64748b",
          }}
        >
          Organization · Team Settings
        </p>

        <h1
          style={{
            fontSize: "28px",
            marginTop: "6px",
            marginBottom: "8px",
            fontWeight: 700,
          }}
        >
          {org ? org.name : "Organization"}
        </h1>

        <Link
          href="/dashboard"
          style={{ fontSize: "12px", color: "#38bdf8", textDecoration: "none" }}
        >
          ← Back to Dashboard
        </Link>

        {error && (
          <p
            style={{
              marginTop: "12px",
              fontSize: "13px",
              color: "#fecaca",
            }}
          >
            ⚠ {error}
          </p>
        )}

        {loading ? (
          <p style={{ marginTop: "20px", fontSize: "13px" }}>Loading…</p>
        ) : (
          <>
            {created && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  background: "#064e3b",
                  color: "#bbf7d0",
                  fontSize: "12px",
                }}
              >
                ✅ New organization created. You are the admin.
              </div>
            )}

            {/* ORG META */}
            {org && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "16px",
                  borderRadius: "12px",
                  background: "#020617",
                  border: "1px solid #1f2937",
                }}
              >
                <p style={{ fontSize: "14px", marginBottom: "4px" }}>
                  <strong>Organization ID:</strong> {org.id}
                </p>
                <p style={{ fontSize: "13px", color: "#9ca3af" }}>
                  Created:{" "}
                  {org.created_at
                    ? new Date(org.created_at).toLocaleString()
                    : "—"}
                </p>
                {membership && (
                  <p
                    style={{
                      fontSize: "12px",
                      marginTop: "6px",
                      color: "#c4b5fd",
                    }}
                  >
                    Your role: <strong>{membership.role}</strong>
                  </p>
                )}
              </div>
            )}

            {/* INVITE FORM */}
            <form
              onSubmit={handleInvite}
              style={{
                marginTop: "24px",
                padding: "16px",
                borderRadius: "12px",
                background: "#020617",
                border: "1px solid #1f2937",
                maxWidth: "420px",
              }}
            >
              <h2
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  marginBottom: "10px",
                }}
              >
                Invite a teammate
              </h2>

              <div style={{ marginBottom: "10px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    marginBottom: "4px",
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  placeholder="teammate@example.com"
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "8px",
                    border: "1px solid #4b5563",
                    fontSize: "13px",
                    background: "#020617",
                    color: "#e5e7eb",
                  }}
                />
              </div>

              <div style={{ marginBottom: "10px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    marginBottom: "4px",
                  }}
                >
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "8px",
                    border: "1px solid #4b5563",
                    fontSize: "13px",
                    background: "#020617",
                    color: "#e5e7eb",
                  }}
                >
                  <option value="member">Viewer</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {inviteError && (
                <p
                  style={{
                    fontSize: "12px",
                    color: "#fecaca",
                    marginBottom: "8px",
                  }}
                >
                  ⚠ {inviteError}
                </p>
              )}

              <button
                type="submit"
                disabled={inviteLoading}
                style={{
                  padding: "8px 16px",
                  borderRadius: "999px",
                  border: "none",
                  background: inviteLoading ? "#6b7280" : "#2563eb",
                  color: "#f9fafb",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: inviteLoading ? "not-allowed" : "pointer",
                }}
              >
                {inviteLoading ? "Sending…" : "Send Invite"}
              </button>

              {inviteLink && (
                <div
                  style={{
                    marginTop: "12px",
                    fontSize: "12px",
                    color: "#e5e7eb",
                  }}
                >
                  <p style={{ marginBottom: "4px" }}>
                    Or share this invite link directly:
                  </p>
                  <div
                    style={{
                      padding: "8px",
                      background: "#020617",
                      borderRadius: "8px",
                      border: "1px solid #4b5563",
                      wordBreak: "break-all",
                    }}
                  >
                    {inviteLink}
                  </div>
                  <button
                    type="button"
                    onClick={copyLink}
                    style={{
                      marginTop: "6px",
                      fontSize: "12px",
                      padding: "6px 10px",
                      borderRadius: "999px",
                      border: "none",
                      background: "#111827",
                      color: "#e5e7eb",
                      cursor: "pointer",
                    }}
                  >
                    Copy Link
                  </button>
                </div>
              )}
            </form>

            {/* MEMBER LIST */}
            <div
              style={{
                marginTop: "24px",
                padding: "16px",
                borderRadius: "12px",
                background: "#020617",
                border: "1px solid #1f2937",
              }}
            >
              <h2
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  marginBottom: "10px",
                }}
              >
                Team Members
              </h2>

              {membersLoading ? (
                <p style={{ fontSize: "13px" }}>Loading members…</p>
              ) : members.length === 0 ? (
                <p style={{ fontSize: "13px", color: "#9ca3af" }}>
                  No members found.
                </p>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={th}>Email</th>
                      <th style={th}>Role</th>
                      <th style={th}>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id}>
                        <td style={td}>{m.email || m.user_id}</td>
                        <td style={td}>{m.role}</td>
                        <td style={td}>
                          {m.created_at
                            ? new Date(m.created_at).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: "6px 8px",
  fontSize: "11px",
  color: "#9ca3af",
  borderBottom: "1px solid #1f2937",
};

const td = {
  padding: "6px 8px",
  borderBottom: "1px solid #111827",
  fontSize: "13px",
  color: "#e5e7eb",
};
