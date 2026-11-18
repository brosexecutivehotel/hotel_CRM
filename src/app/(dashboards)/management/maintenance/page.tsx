import type { Metadata } from "next";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { requireDashboardRole } from "@/lib/auth/roles";
import { getDb } from "@/db";
import { maintenanceLogs, maintenanceWorkOrders, rooms } from "@/db/schema";
import { ManagementShell } from "@/features/management/management-shell";
import { MaintenanceForm } from "@/features/management/maintenance/maintenance-form";
import { AddMaintenanceLogForm, MaintenanceRowActions } from "@/features/management/maintenance/maintenance-actions-ui";

export const metadata: Metadata = {
  title: "Maintenance",
  description: "Track maintenance work orders, priorities, and resolution history.",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  cancelled: "Cancelled",
};

function statusPill(status: string): string {
  if (status === "resolved") return "status-pill status-pill--checked";
  if (status === "cancelled") return "status-pill status-pill--alert";
  if (status === "in_progress") return "status-pill";
  return "status-pill status-pill--alert";
}

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

function priorityPill(priority: string): string {
  if (priority === "urgent" || priority === "high") return "status-pill status-pill--alert";
  if (priority === "medium") return "status-pill";
  return "status-pill status-pill--checked";
}

function formatWhen(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function MaintenancePage() {
  await requireDashboardRole("management");
  const db = getDb();

  const [orders, roomRows] = await Promise.all([
    db
      .select({
        id: maintenanceWorkOrders.id,
        roomId: maintenanceWorkOrders.roomId,
        area: maintenanceWorkOrders.area,
        title: maintenanceWorkOrders.title,
        description: maintenanceWorkOrders.description,
        priority: maintenanceWorkOrders.priority,
        status: maintenanceWorkOrders.status,
        assignedTo: maintenanceWorkOrders.assignedTo,
        reportedBy: maintenanceWorkOrders.reportedBy,
        resolvedAt: maintenanceWorkOrders.resolvedAt,
        createdAt: maintenanceWorkOrders.createdAt,
        updatedAt: maintenanceWorkOrders.updatedAt,
        roomNumber: rooms.number,
        roomType: rooms.type,
      })
      .from(maintenanceWorkOrders)
      .leftJoin(rooms, eq(maintenanceWorkOrders.roomId, rooms.id))
      .orderBy(desc(maintenanceWorkOrders.updatedAt), desc(maintenanceWorkOrders.createdAt)),
    db.select({ id: rooms.id, number: rooms.number, type: rooms.type }).from(rooms).orderBy(asc(rooms.number)),
  ]);

  const orderIds = orders.map((o) => o.id);
  const logs = orderIds.length
    ? await db
        .select({
          id: maintenanceLogs.id,
          workOrderId: maintenanceLogs.workOrderId,
          note: maintenanceLogs.note,
          status: maintenanceLogs.status,
          createdAt: maintenanceLogs.createdAt,
        })
        .from(maintenanceLogs)
        .where(inArray(maintenanceLogs.workOrderId, orderIds))
        .orderBy(desc(maintenanceLogs.createdAt))
    : [];

  const logsByOrder = new Map<string, typeof logs>();
  for (const log of logs) {
    (logsByOrder.get(log.workOrderId) ?? logsByOrder.set(log.workOrderId, []).get(log.workOrderId)!).push(log);
  }

  const openCount = orders.filter((o) => o.status === "open" || o.status === "in_progress").length;

  return (
    <ManagementShell activeNav="Maintenance">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">HOTEL OPERATIONS <span className="live-dot" /> MAINTENANCE</p>
          <h1>Maintenance</h1>
          <p className="welcome-subtitle">Track work orders, priorities, assignments, and resolution history.</p>
        </div>
        <div className="date-filter">
          <span>{orders.length} {orders.length === 1 ? "order" : "orders"} · {openCount} open/in progress</span>
        </div>
      </div>

      <section className="overview-grid">
        <article className="panel" style={{ minWidth: 0 }}>
          <div className="panel-heading">
            <div><h2>Work orders</h2><p>Requests and issues across rooms and hotel areas</p></div>
          </div>
          {orders.length === 0 ? (
            <p className="empty-search">No maintenance work orders yet. Create one to start tracking issues.</p>
          ) : (
            <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
              {orders.map((o) => {
                const orderLogs = logsByOrder.get(o.id) ?? [];
                const location = o.roomNumber ? `Room ${o.roomNumber}${o.roomType ? ` · ${o.roomType}` : ""}` : o.area || "Area not specified";
                return (
                  <div key={o.id} style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: 14, background: "var(--surface)" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 4 }}>
                          <strong style={{ fontSize: 14 }}>{o.title}</strong>
                          <span className={statusPill(o.status)}><i />{statusLabels[o.status] ?? o.status}</span>
                          <span className={priorityPill(o.priority)}><i />{priorityLabels[o.priority] ?? o.priority} priority</span>
                        </div>
                        <div style={{ color: "var(--muted)", fontSize: 12 }}>
                          {location}
                          {o.assignedTo ? ` · Assigned to ${o.assignedTo}` : " · Unassigned"}
                          {o.reportedBy ? ` · Reported by ${o.reportedBy}` : ""}
                        </div>
                        {o.description && <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text)" }}>{o.description}</p>}
                        <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 6 }}>
                          Created {formatWhen(o.createdAt)} · Updated {formatWhen(o.updatedAt)}
                          {o.resolvedAt ? ` · Resolved ${formatWhen(o.resolvedAt)}` : ""}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        <MaintenanceRowActions workOrderId={o.id} status={o.status as "open" | "in_progress" | "resolved" | "cancelled"} />
                      </div>
                    </div>

                    <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                      <strong style={{ fontSize: 12 }}>History / log</strong>
                      {orderLogs.length === 0 ? (
                        <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 12 }}>No log entries yet.</p>
                      ) : (
                        <ul style={{ margin: "8px 0 0", paddingLeft: 18, display: "grid", gap: 6 }}>
                          {orderLogs.map((log) => (
                            <li key={log.id} style={{ fontSize: 12, color: "var(--text)" }}>
                              <span style={{ color: "var(--muted)" }}>{formatWhen(log.createdAt)}</span>
                              {log.status ? <span> · <em>{statusLabels[log.status] ?? log.status}</em></span> : null}
                              {" — "}
                              {log.note}
                            </li>
                          ))}
                        </ul>
                      )}
                      <AddMaintenanceLogForm workOrderId={o.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div><h2>New work order</h2><p>Report an issue for a room or hotel area</p></div>
          </div>
          <MaintenanceForm rooms={roomRows.map((r) => ({ id: r.id, label: `Room ${r.number} · ${r.type}` }))} />
        </article>
      </section>

      <footer className="dashboard-footer">
        <span>© 2026 Bros Executive Hotel</span>
        <span>Maintenance · Work orders and history</span>
      </footer>
    </ManagementShell>
  );
}
