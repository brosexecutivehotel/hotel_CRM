import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";
import { requireDashboardRole } from "@/lib/auth/roles";
import { getDb } from "@/db";
import { guests, reservations, rooms } from "@/db/schema";
import { ManagementShell } from "@/features/management/management-shell";
import { ReservationForm } from "@/features/management/reservations/reservation-form";
import { ReservationRowActions } from "@/features/management/reservations/reservation-row-actions";

export const metadata: Metadata = {
  title: "Reservations",
  description: "Create and manage guest reservations.",
};

const statusLabels: Record<string, string> = {
  reserved: "Reserved",
  checked_in: "Checked in",
  checked_out: "Checked out",
  cancelled: "Cancelled",
};

function statusPillClass(status: string): string {
  if (status === "checked_in") return "status-pill status-pill--checked";
  if (status === "cancelled") return "status-pill status-pill--alert";
  return "status-pill";
}

export default async function ReservationsPage() {
  await requireDashboardRole("management");

  const db = getDb();
  const [reservationRows, roomRows] = await Promise.all([
    db
      .select({
        id: reservations.id,
        reference: reservations.reference,
        checkIn: reservations.checkIn,
        checkOut: reservations.checkOut,
        nights: reservations.nights,
        status: reservations.status,
        source: reservations.source,
        guestName: guests.name,
        guestSegment: guests.segment,
        roomNumber: rooms.number,
        roomType: rooms.type,
      })
      .from(reservations)
      .innerJoin(guests, eq(reservations.guestId, guests.id))
      .innerJoin(rooms, eq(reservations.roomId, rooms.id))
      .orderBy(desc(reservations.checkIn), desc(reservations.createdAt)),
    db.select({ id: rooms.id, number: rooms.number, type: rooms.type }).from(rooms).orderBy(asc(rooms.number)),
  ]);

  return (
    <ManagementShell activeNav="Reservations">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">HOTEL OPERATIONS <span className="live-dot" /> RESERVATIONS</p>
          <h1>Reservations</h1>
          <p className="welcome-subtitle">Create reservations, assign rooms, and track guest stays.</p>
        </div>
        <div className="date-filter"><span>{reservationRows.length} {reservationRows.length === 1 ? "reservation" : "reservations"}</span></div>
      </div>

      <section className="overview-grid">
        <article className="panel" style={{ minWidth: 0 }}>
          <div className="panel-heading">
            <div><h2>All reservations</h2><p>Guest stays recorded in the system</p></div>
          </div>
          <div className="table-wrap">
            {reservationRows.length === 0 ? (
              <p className="empty-search">No reservations yet. Use the form to create the first one.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>REF</th>
                    <th>GUEST</th>
                    <th>ROOM</th>
                    <th>DATES</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {reservationRows.map((r) => (
                    <tr key={r.id}>
                      <td><strong className="room-number">{r.reference}</strong></td>
                      <td>
                        <div className="guest-cell">
                          <span><strong>{r.guestName}</strong><small>{r.guestSegment} · {r.source.replace("_", ".")}</small></span>
                        </div>
                      </td>
                      <td>#{r.roomNumber} <small style={{ color: "var(--muted)" }}>{r.roomType}</small></td>
                      <td>{r.checkIn} → {r.checkOut} <small style={{ color: "var(--muted)" }}>({r.nights}n)</small></td>
                      <td><span className={statusPillClass(r.status)}><i />{statusLabels[r.status] ?? r.status}</span></td>
                      <td><ReservationRowActions reservationId={r.id} status={r.status as "reserved" | "checked_in" | "checked_out" | "cancelled"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div><h2>New reservation</h2><p>Enter guest details and assign a room</p></div>
          </div>
          {roomRows.length === 0 ? (
            <p className="empty-search" style={{ textAlign: "left" }}>
              Add at least one room in <strong>Rooms</strong> before creating reservations.
            </p>
          ) : (
            <ReservationForm rooms={roomRows.map((r) => ({ id: r.id, number: r.number, type: r.type }))} />
          )}
        </article>
      </section>

      <footer className="dashboard-footer">
        <span>© 2026 Bros Executive Hotel</span>
        <span>Reservations · Live reservation data</span>
      </footer>
    </ManagementShell>
  );
}
