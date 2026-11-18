import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { requireDashboardRole } from "@/lib/auth/roles";
import { getDb } from "@/db";
import { guests, payments, reservations, rooms } from "@/db/schema";
import { ManagementShell } from "@/features/management/management-shell";
import { PaymentForm } from "@/features/management/payments/payment-form";
import { PaymentRowActions } from "@/features/management/payments/payment-row-actions";

export const metadata: Metadata = {
  title: "Payments",
  description: "Record and track reservation payments.",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  refunded: "Refunded",
};

const methodLabels: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  mobile_money: "Mobile money",
  bank_transfer: "Bank transfer",
};

function statusPillClass(status: string): string {
  if (status === "paid") return "status-pill status-pill--checked";
  if (status === "refunded") return "status-pill status-pill--alert";
  return "status-pill";
}

function formatMoney(amount: string | number, currency: string): string {
  return `${currency} ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export default async function PaymentsPage() {
  await requireDashboardRole("management");

  const db = getDb();
  const [paymentRows, reservationRows] = await Promise.all([
    db
      .select({
        id: payments.id,
        amount: payments.amount,
        currency: payments.currency,
        method: payments.method,
        status: payments.status,
        paidAt: payments.paidAt,
        createdAt: payments.createdAt,
        reference: reservations.reference,
        guestName: guests.name,
        roomNumber: rooms.number,
      })
      .from(payments)
      .innerJoin(reservations, eq(payments.reservationId, reservations.id))
      .innerJoin(guests, eq(reservations.guestId, guests.id))
      .innerJoin(rooms, eq(reservations.roomId, rooms.id))
      .orderBy(desc(payments.createdAt)),
    db
      .select({
        id: reservations.id,
        reference: reservations.reference,
        guestName: guests.name,
        roomNumber: rooms.number,
      })
      .from(reservations)
      .innerJoin(guests, eq(reservations.guestId, guests.id))
      .innerJoin(rooms, eq(reservations.roomId, rooms.id))
      .orderBy(desc(reservations.createdAt)),
  ]);

  const reservationOptions = reservationRows.map((r) => ({
    id: r.id,
    label: `${r.reference} · ${r.guestName} · Room ${r.roomNumber}`,
  }));

  return (
    <ManagementShell activeNav="Payments">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">HOTEL OPERATIONS <span className="live-dot" /> PAYMENTS</p>
          <h1>Payments</h1>
          <p className="welcome-subtitle">Record, track, and update reservation payments.</p>
        </div>
        <div className="date-filter"><span>{paymentRows.length} {paymentRows.length === 1 ? "payment" : "payments"}</span></div>
      </div>

      <section className="overview-grid">
        <article className="panel" style={{ minWidth: 0 }}>
          <div className="panel-heading">
            <div><h2>Payment records</h2><p>Transactions linked to reservations</p></div>
          </div>
          <div className="table-wrap">
            {paymentRows.length === 0 ? (
              <p className="empty-search">No payments recorded yet. Use the form to add one.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>RESERVATION</th>
                    <th>GUEST</th>
                    <th>AMOUNT</th>
                    <th>METHOD</th>
                    <th>STATUS</th>
                    <th>PAID AT</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentRows.map((p) => (
                    <tr key={p.id}>
                      <td><strong className="room-number">{p.reference}</strong> <small style={{ color: "var(--muted)" }}>Room {p.roomNumber}</small></td>
                      <td>{p.guestName}</td>
                      <td><strong>{formatMoney(p.amount, p.currency)}</strong></td>
                      <td>{methodLabels[p.method] ?? p.method}</td>
                      <td><span className={statusPillClass(p.status)}><i />{statusLabels[p.status] ?? p.status}</span></td>
                      <td>{formatWhen(p.paidAt)}</td>
                      <td><PaymentRowActions paymentId={p.id} status={p.status as "pending" | "paid" | "refunded"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div><h2>Record payment</h2><p>Add a payment against a reservation</p></div>
          </div>
          {reservationOptions.length === 0 ? (
            <p className="empty-search" style={{ textAlign: "left" }}>
              Create a reservation first before recording payments.
            </p>
          ) : (
            <PaymentForm reservations={reservationOptions} />
          )}
        </article>
      </section>

      <footer className="dashboard-footer">
        <span>© 2026 Bros Executive Hotel</span>
        <span>Payments · Live payment data</span>
      </footer>
    </ManagementShell>
  );
}
