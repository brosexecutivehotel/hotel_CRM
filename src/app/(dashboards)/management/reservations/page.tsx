import type { Metadata } from "next";
import Link from "next/link";
import { requireDashboardRole } from "@/lib/auth/roles";
import { ManagementShell } from "@/features/management/management-shell";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Reservations",
  description: "Reservations overview.",
};

export default async function ReservationsPage() {
  await requireDashboardRole("management");

  return (
    <ManagementShell activeNav="Reservations">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">HOTEL OPERATIONS <span className="live-dot" /> PLANNED MODULE</p>
          <h1>Reservations</h1>
          <p className="welcome-subtitle">Reservation management is being set up. For now, arrivals and departures on the Overview reflect live reservation data when available.</p>
        </div>
      </div>

      <section className="overview-grid" style={{ gridTemplateColumns: "1fr" }}>
        <article className="panel">
          <div className="panel-heading">
            <div><h2>Coming soon</h2><p>This workspace will let you create, view, and manage guest reservations.</p></div>
          </div>
          <p className="empty-search" style={{ textAlign: "left", marginTop: 8 }}>
            In the meantime, you can manage your <Link href="/management/rooms" style={{ color: "#7a5d00", fontWeight: 600 }}>room inventory</Link> and
            review the <Link href="/management/activity" style={{ color: "#7a5d00", fontWeight: 600 }}>activity log</Link>.
          </p>
          <div style={{ marginTop: 16 }}>
            <Link href="/management" className="text-button" style={{ textDecoration: "none" }}>
              <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><Icon name="chevron" size={14} /></span> Back to Overview
            </Link>
          </div>
        </article>
      </section>

      <footer className="dashboard-footer">
        <span>© 2026 Bros Executive Hotel</span>
        <span>Reservations · Module in progress</span>
      </footer>
    </ManagementShell>
  );
}
