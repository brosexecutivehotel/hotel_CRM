import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";
import { requireDashboardRole } from "@/lib/auth/roles";
import { getDb } from "@/db";
import { housekeepingTasks, rooms } from "@/db/schema";
import { ManagementShell } from "@/features/management/management-shell";
import { HousekeepingForm } from "@/features/management/housekeeping/housekeeping-form";
import { HousekeepingRowActions } from "@/features/management/housekeeping/housekeeping-row-actions";

export const metadata: Metadata = {
  title: "Housekeeping",
  description: "Manage housekeeping tasks and room readiness.",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
};

function statusPillClass(status: string): string {
  if (status === "done") return "status-pill status-pill--checked";
  if (status === "in_progress") return "status-pill";
  return "status-pill status-pill--alert";
}

function formatWhen(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function HousekeepingPage() {
  await requireDashboardRole("management");

  const db = getDb();
  const [taskRows, roomRows] = await Promise.all([
    db
      .select({
        id: housekeepingTasks.id,
        status: housekeepingTasks.status,
        assignedTo: housekeepingTasks.assignedTo,
        createdAt: housekeepingTasks.createdAt,
        updatedAt: housekeepingTasks.updatedAt,
        roomNumber: rooms.number,
        roomType: rooms.type,
      })
      .from(housekeepingTasks)
      .innerJoin(rooms, eq(housekeepingTasks.roomId, rooms.id))
      .orderBy(desc(housekeepingTasks.updatedAt), desc(housekeepingTasks.createdAt)),
    db.select({ id: rooms.id, number: rooms.number, type: rooms.type }).from(rooms).orderBy(asc(rooms.number)),
  ]);

  return (
    <ManagementShell activeNav="Housekeeping">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">HOTEL OPERATIONS <span className="live-dot" /> HOUSEKEEPING</p>
          <h1>Housekeeping</h1>
          <p className="welcome-subtitle">Track cleaning tasks, assignments, and room readiness.</p>
        </div>
        <div className="date-filter"><span>{taskRows.length} {taskRows.length === 1 ? "task" : "tasks"}</span></div>
      </div>

      <section className="overview-grid">
        <article className="panel" style={{ minWidth: 0 }}>
          <div className="panel-heading">
            <div><h2>Tasks</h2><p>Housekeeping work across the property</p></div>
          </div>
          <div className="table-wrap">
            {taskRows.length === 0 ? (
              <p className="empty-search">No housekeeping tasks yet. Use the form to create one.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>ROOM</th>
                    <th>ASSIGNED TO</th>
                    <th>STATUS</th>
                    <th>UPDATED</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {taskRows.map((t) => (
                    <tr key={t.id}>
                      <td>#{t.roomNumber} <small style={{ color: "var(--muted)" }}>{t.roomType}</small></td>
                      <td>{t.assignedTo || <span style={{ color: "var(--muted)" }}>Unassigned</span>}</td>
                      <td><span className={statusPillClass(t.status)}><i />{statusLabels[t.status] ?? t.status}</span></td>
                      <td>{formatWhen(t.updatedAt ?? t.createdAt)}</td>
                      <td><HousekeepingRowActions taskId={t.id} status={t.status as "pending" | "in_progress" | "done"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div><h2>New task</h2><p>Create and assign a housekeeping task</p></div>
          </div>
          {roomRows.length === 0 ? (
            <p className="empty-search" style={{ textAlign: "left" }}>
              Add at least one room in <strong>Rooms</strong> before creating housekeeping tasks.
            </p>
          ) : (
            <HousekeepingForm rooms={roomRows.map((r) => ({ id: r.id, number: r.number, type: r.type }))} />
          )}
        </article>
      </section>

      <footer className="dashboard-footer">
        <span>© 2026 Bros Executive Hotel</span>
        <span>Housekeeping · Live task data</span>
      </footer>
    </ManagementShell>
  );
}
