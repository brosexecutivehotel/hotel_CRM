import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { requireDashboardRole } from "@/lib/auth/roles";
import { ManagementShell } from "@/features/management/management-shell";
import { listStaffUsers } from "@/features/management/settings/settings-actions";
import { InviteUserForm, UserRoleForm, UserStatusActions } from "@/features/management/settings/settings-forms";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage staff users and access.",
};

function formatWhen(ts: number | null): string {
  if (!ts) return "Never";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

const roleLabels: Record<string, string> = {
  management: "Management",
  front_desk: "Front desk",
  crm: "CRM",
  none: "No access",
};

export default async function SettingsPage() {
  await requireDashboardRole("management");
  const { userId: selfId } = await auth();
  const { users, error } = await listStaffUsers();

  return (
    <ManagementShell activeNav="Settings">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">MANAGEMENT <span className="live-dot" /> SETTINGS</p>
          <h1>Settings</h1>
          <p className="welcome-subtitle">Manage staff access, roles, and user accounts via Clerk.</p>
        </div>
        <div className="date-filter"><span>{users.length} {users.length === 1 ? "user" : "users"}</span></div>
      </div>

      <section className="overview-grid">
        <article className="panel" style={{ minWidth: 0 }}>
          <div className="panel-heading">
            <div><h2>Users & access</h2><p>Assign dashboard roles, deactivate/reactivate, or remove users</p></div>
          </div>
          {error ? (
            <p className="field-error" role="alert" style={{ marginTop: 12 }}>Could not load users from Clerk: {error}</p>
          ) : users.length === 0 ? (
            <p className="empty-search" style={{ marginTop: 12 }}>No users found.</p>
          ) : (
            <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
              {users.map((u) => {
                const isSelf = u.id === selfId;
                return (
                  <div key={u.id} style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: 14, background: "var(--surface)" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <strong style={{ fontSize: 14 }}>{u.name}</strong>
                          {isSelf && <span className="status-pill"><i />You</span>}
                          <span className={u.banned ? "status-pill status-pill--alert" : "status-pill status-pill--checked"}>
                            <i />{u.banned ? "Deactivated" : "Active"}
                          </span>
                          <span className={u.role === "none" ? "status-pill status-pill--alert" : "status-pill"}>
                            <i />{roleLabels[u.role] ?? u.role}
                          </span>
                        </div>
                        <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>{u.email}</div>
                        <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 4 }}>
                          Last sign-in: {formatWhen(u.lastSignInAt)} · Joined: {formatWhen(u.createdAt)}
                        </div>
                        <div style={{ marginTop: 10 }}>
                          <UserRoleForm userId={u.id} currentRole={u.role} />
                        </div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        <UserStatusActions userId={u.id} banned={u.banned} isSelf={isSelf} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="room-form-hint" style={{ marginTop: 14 }}>
            Roles are stored in Clerk <code>privateMetadata.role</code> and control dashboard access (management, front desk, CRM). Users without a role are sent to Access pending.
          </p>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div><h2>Provision user</h2><p>Invite a new staff member via Clerk</p></div>
          </div>
          <InviteUserForm />
          <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 13 }}>Using Clerk directly</h3>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 12, lineHeight: 1.5 }}>
              You can also manage users, authentication methods, and invitations in the Clerk Dashboard. Changes made there will be reflected here after refresh.
            </p>
          </div>
        </article>
      </section>

      <footer className="dashboard-footer">
        <span>© 2026 Bros Executive Hotel</span>
        <span>Settings · User and access management</span>
      </footer>
    </ManagementShell>
  );
}
