"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Icon } from "@/components/ui/icon";
import { HotelLogo } from "@/components/brand/hotel-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DashboardSwitcher } from "@/components/ui/dashboard-switcher";
import type { DashboardRole } from "@/lib/auth/roles";
import { ReservationRowActions } from "@/features/management/reservations/reservation-row-actions";
import { ReservationForm } from "@/features/management/reservations/reservation-form";
import { PaymentForm } from "@/features/management/payments/payment-form";
import { RoomStatusControl } from "./room-status-control";
import { HotelTimeCounter } from "./hotel-time-counter";
import type { FrontDeskData } from "./front-desk-data-server";
import styles from "./front-desk-dashboard.module.css";

const roomStateClasses: Record<string, string | undefined> = {
  Ready: styles.roomStateReady,
  Cleaning: styles.roomStateCleaning,
  Reserved: styles.roomStateReserved,
  Occupied: styles.roomStateOccupied,
  Maintenance: styles.roomStateReserved,
};

export default function FrontDeskDashboard({ data, viewerRole }: { data: FrontDeskData; viewerRole: DashboardRole }) {
  const [query, setQuery] = useState("");
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    const modalOpen = isReservationOpen || !!paymentTarget;
    if (!modalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsReservationOpen(false);
        setPaymentTarget(null);
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isReservationOpen, paymentTarget]);

  const visibleArrivals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return data.arrivals;
    return data.arrivals.filter((arrival) =>
      `${arrival.name} ${arrival.booking} ${arrival.room} ${arrival.status}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, data.arrivals]);

  const s = data.summary;

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/front-desk">
          <HotelLogo className={styles.brandLogo} size={40} />
          <span><strong>BROS EXECUTIVE</strong><small>FRONT DESK</small></span>
        </Link>
        <span className={styles.workspaceLabel}>Front desk workspace</span>
        <div className={styles.headerRight}>
          {viewerRole === "management" && <DashboardSwitcher viewerRole={viewerRole} current="front_desk" />}
          <ThemeToggle />
          <span className={styles.localTime}><Icon name="clock" size={15} /> <HotelTimeCounter /></span>
          <UserButton />
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.pageHeading}>
          <div>
            <p className={styles.kicker}>PROPERTY OPERATIONS <span /> {data.todayLabel}</p>
            <h1>Front desk</h1>
            <p className={styles.subtitle}>Manage today&apos;s arrivals, departures, and room readiness.</p>
          </div>
          <div className={styles.headingActions}>
            <span className={styles.secondaryButton}><Icon name="calendar" size={16} /> Today</span>
            <button type="button" className={styles.primaryButton} onClick={() => setIsReservationOpen(true)}>
              <Icon name="plus" size={16} /> New reservation
            </button>
          </div>
        </section>

        <section className={styles.summaryGrid} aria-label="Front desk summary">
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Arrivals</span><span className={`${styles.summaryIcon} ${styles.iconBlue}`}><Icon name="arrow-down" size={18} /></span>
            <strong>{s.arrivalsTotal}</strong><small><b>{s.arrivalsCheckedIn} checked in</b> · {Math.max(0, s.arrivalsTotal - s.arrivalsCheckedIn)} expected</small>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Departures</span><span className={`${styles.summaryIcon} ${styles.iconAmber}`}><Icon name="arrow-up" size={18} /></span>
            <strong>{s.departuresTotal}</strong><small><b>{s.departuresCheckedOut} checked out</b> · {Math.max(0, s.departuresTotal - s.departuresCheckedOut)} expected</small>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Rooms ready</span><span className={`${styles.summaryIcon} ${styles.iconGreen}`}><Icon name="check" size={18} /></span>
            <strong>{s.roomsReady}</strong><small><b>{s.roomsHousekeeping} in housekeeping</b> · {s.roomsMaintenance} maintenance</small>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>In-house guests</span><span className={`${styles.summaryIcon} ${styles.iconViolet}`}><Icon name="users" size={18} /></span>
            <strong>{s.inHouseGuests}</strong><small><b>{s.occupancyPercent}% occupancy</b> across {s.totalRooms} rooms</small>
          </article>
        </section>

        <section className={styles.workGrid}>
          <article className={styles.panel}>
            <div className={styles.panelHeading}>
              <div><h2>Arrival queue <span>{data.arrivals.length}</span></h2><p>Today&apos;s expected check-ins</p></div>
              <label className={styles.search}>
                <Icon name="search" size={16} />
                <input aria-label="Search arrivals" onChange={(event) => setQuery(event.target.value)} placeholder="Find a guest or room" value={query} />
              </label>
            </div>
            <div className={styles.tableScroller}>
              {data.arrivals.length === 0 ? (
                <p className={styles.emptyState}>No arrivals scheduled for today.</p>
              ) : (
                <>
                  <table className={styles.arrivalTable}>
                    <thead><tr><th>GUEST / BOOKING</th><th>ROOM</th><th>STAY</th><th>STATUS</th><th>PAYMENT</th><th>ACTIONS</th></tr></thead>
                    <tbody>
                      {visibleArrivals.map((arrival) => (
                        <tr key={arrival.id}>
                          <td><div className={styles.guestCell}><span className={styles.guestAvatar}>{arrival.initials}</span><span><strong>{arrival.name}</strong><small>{arrival.booking}</small></span></div></td>
                          <td><strong className={styles.roomNumber}>{arrival.room}</strong></td>
                          <td>{arrival.nights} nights</td>
                          <td><span className={arrival.rawStatus === "checked_in" ? styles.checkedIn : styles.expected}><i />{arrival.status}</span></td>
                          <td><span className={`${styles.paymentBadge} ${styles[`payment_${arrival.paymentTone}`] ?? ""}`}>{arrival.paymentLabel}</span></td>
                          <td className={styles.actionsCell}>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                              <ReservationRowActions reservationId={arrival.id} status={arrival.rawStatus} />
                              <button
                                type="button"
                                className="row-action"
                                onClick={() => setPaymentTarget({ id: arrival.id, label: `${arrival.booking} · ${arrival.name}` })}
                              >
                                Record payment
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {visibleArrivals.length === 0 && <p className={styles.emptyState}>No arrivals match “{query}”.</p>}
                </>
              )}
            </div>
            <footer className={styles.tableFooter}><span>Showing {visibleArrivals.length} of {data.arrivals.length} arrivals</span><Link href="/management/reservations">Open reservations <Icon name="arrow-right" size={14} /></Link></footer>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeading}>
              <div><h2>Room board</h2><p>Today&apos;s room readiness</p></div>
              <span className={styles.filterButton}><Icon name="filter" size={15} /> All rooms</span>
            </div>
            <div className={styles.roomGrid}>
              {data.rooms.length === 0 ? (
                <p className={styles.emptyState}>No rooms configured yet.</p>
              ) : (
                data.rooms.map((room) => (
                  <div className={styles.roomCard} key={room.id}>
                    <div className={styles.roomCardTop}><span className={styles.roomIcon}><Icon name="bed" size={17} /></span><span className={`${styles.roomState} ${roomStateClasses[room.state] ?? ""}`}>{room.state}</span></div>
                    <strong>{room.number}</strong><small>{room.type}</small>
                    <RoomStatusControl roomId={room.id} current={room.rawStatus} />
                  </div>
                ))
              )}
            </div>
            <div className={styles.roomLegend}><span><i className={styles.legendReady} />Ready</span><span><i className={styles.legendReserved} />Reserved</span><span><i className={styles.legendCleaning} />Cleaning</span></div>
          </article>
        </section>

        <section className={styles.workGrid} style={{ marginTop: 0 }}>
          <article className={styles.panel} style={{ gridColumn: "1 / -1" }}>
            <div className={styles.panelHeading}>
              <div><h2>Departure queue <span>{data.departures.length}</span></h2><p>Today&apos;s expected check-outs</p></div>
            </div>
            <div className={styles.tableScroller}>
              {data.departures.length === 0 ? (
                <p className={styles.emptyState}>No departures scheduled for today.</p>
              ) : (
                <table className={styles.arrivalTable}>
                  <thead><tr><th>GUEST / BOOKING</th><th>ROOM</th><th>STAY</th><th>STATUS</th><th>PAYMENT</th><th>ACTIONS</th></tr></thead>
                  <tbody>
                    {data.departures.map((dep) => (
                      <tr key={dep.id}>
                        <td><div className={styles.guestCell}><span className={styles.guestAvatar}>{dep.initials}</span><span><strong>{dep.name}</strong><small>{dep.booking}</small></span></div></td>
                        <td><strong className={styles.roomNumber}>{dep.room}</strong></td>
                        <td>{dep.nights} nights</td>
                        <td><span className={dep.rawStatus === "checked_out" ? styles.checkedIn : styles.expected}><i />{dep.status}</span></td>
                        <td><span className={`${styles.paymentBadge} ${styles[`payment_${dep.paymentTone}`] ?? ""}`}>{dep.paymentLabel}</span></td>
                        <td className={styles.actionsCell}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                            <ReservationRowActions reservationId={dep.id} status={dep.rawStatus} />
                            <button
                              type="button"
                              className="row-action"
                              onClick={() => setPaymentTarget({ id: dep.id, label: `${dep.booking} · ${dep.name}` })}
                            >
                              Record payment
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <footer className={styles.tableFooter}><span>{s.departuresCheckedOut} checked out · {Math.max(0, s.departuresTotal - s.departuresCheckedOut)} remaining</span></footer>
          </article>
        </section>

        {isReservationOpen && (
          <div
            className={styles.modalOverlay}
            role="presentation"
            onClick={() => setIsReservationOpen(false)}
          >
            <div
              className={styles.modalPanel}
              role="dialog"
              aria-modal="true"
              aria-labelledby="new-reservation-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div>
                  <h2 id="new-reservation-title">New reservation</h2>
                  <p>Create a booking for walk-ins, calls, or direct requests</p>
                </div>
                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={() => setIsReservationOpen(false)}
                  aria-label="Close reservation form"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
              <div className={styles.modalBody}>
                {data.rooms.length === 0 ? (
                  <p className={styles.emptyState} style={{ textAlign: "left", padding: 0 }}>
                    Add rooms in the management workspace before creating reservations.
                  </p>
                ) : (
                  <ReservationForm
                    rooms={data.rooms.map((r) => ({ id: r.id, number: r.number, type: r.type }))}
                    onSuccess={() => setIsReservationOpen(false)}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {paymentTarget && (
          <div
            className={styles.modalOverlay}
            role="presentation"
            onClick={() => setPaymentTarget(null)}
          >
            <div
              className={styles.modalPanel}
              role="dialog"
              aria-modal="true"
              aria-labelledby="record-payment-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div>
                  <h2 id="record-payment-title">Record payment</h2>
                  <p>{paymentTarget.label}</p>
                </div>
                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={() => setPaymentTarget(null)}
                  aria-label="Close payment form"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
              <div className={styles.modalBody}>
                <PaymentForm
                  reservations={Array.from(
                    new Map(
                      [...data.arrivals, ...data.departures].map((s) => [s.id, { id: s.id, label: `${s.booking} · ${s.name}` }]),
                    ).values(),
                  )}
                  defaultReservationId={paymentTarget.id}
                  onSuccess={() => setPaymentTarget(null)}
                />
              </div>
            </div>
          </div>
        )}

        <footer className={styles.footer}><span>Front desk workspace</span><span>Live operational data · Hotel local time EAT</span><span className={styles.systemStatus}><i /> All systems operational</span></footer>
      </div>
    </main>
  );
}
