import type { Metadata } from "next";
import { asc, sql } from "drizzle-orm";
import { requireDashboardRole } from "@/lib/auth/roles";
import { getDb } from "@/db";
import { rooms } from "@/db/schema";
import { ManagementShell } from "@/features/management/management-shell";
import { RoomForm } from "@/features/management/rooms/room-form";

export const metadata: Metadata = {
  title: "Room inventory",
  description: "Add and manage the rooms in your property.",
};

const statusLabels: Record<string, string> = {
  ready: "Ready",
  cleaning: "Cleaning",
  reserved: "Reserved",
  occupied: "Occupied",
  maintenance: "Maintenance",
};

function statusPillClass(status: string): string {
  if (status === "ready") return "status-pill status-pill--checked";
  if (status === "maintenance") return "status-pill status-pill--alert";
  return "status-pill";
}

export default async function RoomsPage() {
  await requireDashboardRole("management");

  const db = getDb();
  const roomList = await db
    .select()
    .from(rooms)
    .orderBy(sql`${rooms.number}::int asc nulls last`, asc(rooms.number));

  return (
    <ManagementShell activeNav="Rooms">
          <div className="welcome-row">
            <div>
              <p className="eyebrow">HOTEL OPERATIONS <span className="live-dot" /> PROPERTY INVENTORY</p>
              <h1>Room inventory</h1>
              <p className="welcome-subtitle">Add every room in the property — this is the source of truth for the room board.</p>
            </div>
            <div className="date-filter"><span>{roomList.length} {roomList.length === 1 ? "room" : "rooms"} total</span></div>
          </div>

          <section className="overview-grid">
            <article className="panel">
              <div className="panel-heading">
                <div><h2>All rooms</h2><p>Rooms you add here appear across the operations modules</p></div>
              </div>
              <div className="table-wrap">
                {roomList.length === 0 ? (
                  <p className="empty-search">
                    No rooms yet. Use the form to add your first room.
                  </p>
                ) : (
                  <table>
                    <thead>
                      <tr><th>ROOM</th><th>TYPE</th><th>FLOOR</th><th>STATUS</th></tr>
                    </thead>
                    <tbody>
                      {roomList.map((room) => (
                        <tr key={room.id}>
                          <td><strong className="room-number">{room.number}</strong></td>
                          <td>{room.type}</td>
                          <td>{room.floor ?? "—"}</td>
                          <td>
                            <span className={statusPillClass(room.status)}>
                              <i />
                              {statusLabels[room.status] ?? room.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </article>

            <article className="panel">
              <div className="panel-heading">
                <div><h2>Add a room</h2><p>Enter the details exactly as they appear on the door</p></div>
              </div>
              <RoomForm />
            </article>
          </section>

          <footer className="dashboard-footer">
            <span>© 2026 Bros Executive Hotel</span>
            <span>Room inventory · Managed by the management role</span>
          </footer>
    </ManagementShell>
  );
}
