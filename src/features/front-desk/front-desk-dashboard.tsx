"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Icon } from "@/components/ui/icon";
import { HotelLogo } from "@/components/brand/hotel-logo";
import { frontDeskArrivals, frontDeskRooms } from "./front-desk-data";
import styles from "./front-desk-dashboard.module.css";

const roomStateClasses = {
  Ready: styles.roomStateReady,
  Cleaning: styles.roomStateCleaning,
  Reserved: styles.roomStateReserved,
  Occupied: styles.roomStateOccupied,
};

export default function FrontDeskDashboard() {
  const [query, setQuery] = useState("");

  const visibleArrivals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return frontDeskArrivals;

    return frontDeskArrivals.filter((arrival) =>
      `${arrival.name} ${arrival.booking} ${arrival.room} ${arrival.status}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query]);

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/front-desk">
          <HotelLogo className={styles.brandLogo} size={40} />
          <span><strong>BROS EXECUTIVE</strong><small>FRONT DESK</small></span>
        </Link>
        <span className={styles.workspaceLabel}>Front desk workspace</span>
        <div className={styles.headerRight}>
          <span className={styles.localTime}><Icon name="clock" size={15} /> 10:42 AM <small>EAT</small></span>
          <UserButton />
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.pageHeading}>
          <div>
            <p className={styles.kicker}>PROPERTY OPERATIONS <span /> FRIDAY, OCTOBER 31</p>
            <h1>Front desk</h1>
            <p className={styles.subtitle}>Your arrivals, departures, and room readiness in one place.</p>
          </div>
          <div className={styles.headingActions}>
            <span className={styles.secondaryButton}><Icon name="calendar" size={16} /> Today <span>⌄</span></span>
            <button disabled title="Reservation creation will be added to the reservations module" type="button" className={styles.primaryButton}><Icon name="plus" size={16} /> New reservation</button>
          </div>
        </section>

        <section className={styles.summaryGrid} aria-label="Front desk summary">
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Arrivals</span><span className={`${styles.summaryIcon} ${styles.iconBlue}`}><Icon name="arrow-down" size={18} /></span>
            <strong>14</strong><small><b>5 checked in</b> · 9 expected</small>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Departures</span><span className={`${styles.summaryIcon} ${styles.iconAmber}`}><Icon name="arrow-up" size={18} /></span>
            <strong>9</strong><small><b>4 checked out</b> · 5 expected</small>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Rooms ready</span><span className={`${styles.summaryIcon} ${styles.iconGreen}`}><Icon name="check" size={18} /></span>
            <strong>18</strong><small><b>6 in housekeeping</b> · 3 maintenance</small>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>In-house guests</span><span className={`${styles.summaryIcon} ${styles.iconViolet}`}><Icon name="users" size={18} /></span>
            <strong>98</strong><small><b>78.4% occupancy</b> across 125 rooms</small>
          </article>
        </section>

        <section className={styles.workGrid}>
          <article className={styles.panel}>
            <div className={styles.panelHeading}>
              <div><h2>Arrival queue <span>14</span></h2><p>Prepare for today’s expected check-ins</p></div>
              <label className={styles.search}>
                <Icon name="search" size={16} />
                <input aria-label="Search arrivals" onChange={(event) => setQuery(event.target.value)} placeholder="Find a guest or room" value={query} />
              </label>
            </div>
            <div className={styles.tableScroller}>
              <table className={styles.arrivalTable}>
                <thead><tr><th>GUEST / BOOKING</th><th>ROOM</th><th>ARRIVAL</th><th>STAY</th><th>STATUS</th></tr></thead>
                <tbody>
                  {visibleArrivals.map((arrival) => (
                    <tr key={arrival.booking}>
                      <td><div className={styles.guestCell}><span className={styles.guestAvatar}>{arrival.initials}</span><span><strong>{arrival.name}</strong><small>{arrival.booking}</small></span></div></td>
                      <td><strong className={styles.roomNumber}>{arrival.room}</strong></td>
                      <td>{arrival.arrival}</td>
                      <td>{arrival.nights} nights</td>
                      <td><span className={arrival.status === "Checked in" ? styles.checkedIn : styles.expected}><i />{arrival.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleArrivals.length === 0 && <p className={styles.emptyState}>No arrivals match “{query}”.</p>}
            </div>
            <footer className={styles.tableFooter}><span>Showing {visibleArrivals.length} of 14 arrivals</span><Link href="/crm">Open guest profiles <Icon name="arrow-right" size={14} /></Link></footer>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeading}>
              <div><h2>Room board</h2><p>Quick view of today’s room readiness</p></div>
              <span className={styles.filterButton}><Icon name="filter" size={15} /> All rooms</span>
            </div>
            <div className={styles.roomGrid}>
              {frontDeskRooms.map((room) => (
                <div className={styles.roomCard} key={room.number}>
                  <div className={styles.roomCardTop}><span className={styles.roomIcon}><Icon name="bed" size={17} /></span><span className={`${styles.roomState} ${roomStateClasses[room.state]}`}>{room.state}</span></div>
                  <strong>{room.number}</strong><small>{room.type}</small>
                </div>
              ))}
            </div>
            <div className={styles.roomLegend}><span><i className={styles.legendReady} />Ready</span><span><i className={styles.legendReserved} />Reserved</span><span><i className={styles.legendCleaning} />Cleaning</span></div>
          </article>
        </section>

        <footer className={styles.footer}><span>Front desk workspace</span><span>Sample operational data · Hotel local time EAT</span><span className={styles.systemStatus}><i /> All systems operational</span></footer>
      </div>
    </main>
  );
}
