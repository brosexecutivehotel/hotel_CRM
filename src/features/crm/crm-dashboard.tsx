"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Icon } from "@/components/ui/icon";
import { HotelLogo } from "@/components/brand/hotel-logo";
import { guestProfiles, type GuestSegment } from "./crm-data";
import styles from "./crm-dashboard.module.css";

const segments: ("All guests" | GuestSegment)[] = ["All guests", "VIP", "Returning", "Corporate", "New"];

export default function CrmDashboard() {
  const [query, setQuery] = useState("");
  const [selectedSegment, setSelectedSegment] = useState<(typeof segments)[number]>("All guests");

  const visibleGuests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return guestProfiles.filter((guest) => {
      const matchesSegment = selectedSegment === "All guests" || guest.segment === selectedSegment;
      const matchesQuery = !normalizedQuery
        || `${guest.name} ${guest.email} ${guest.country} ${guest.segment}`.toLowerCase().includes(normalizedQuery);

      return matchesSegment && matchesQuery;
    });
  }, [query, selectedSegment]);

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/crm">
          <HotelLogo className={styles.brandLogo} size={40} />
          <span><strong>BROS EXECUTIVE</strong><small>GUEST RELATIONSHIPS</small></span>
        </Link>
        <p className={styles.navCaption}>CUSTOMER RELATIONSHIP</p>
        <nav className={styles.sideNav} aria-label="CRM sections">
          <a className={styles.sideNavActive} href="#guest-overview"><Icon name="grid" size={17} /> Overview</a>
          <a className={styles.sideNavLink} href="#guest-directory"><Icon name="users" size={17} /> Guest directory</a>
          <a className={styles.sideNavLink} href="#guest-segments"><Icon name="star" size={17} /> Guest segments</a>
          <a className={styles.sideNavLink} href="#guest-feedback"><Icon name="sparkles" size={17} /> Feedback & notes</a>
        </nav>
        <div className={styles.sidebarBottom}>
          <span className={styles.sidebarNoteIcon}><Icon name="globe" size={16} /></span>
          <span><strong>Guest-first service</strong><small>One profile, every stay.</small></span>
        </div>
      </aside>

      <section className={styles.main}>
        <header className={styles.topbar}>
          <Link className={styles.mobileBrand} href="/crm" aria-label="Bros Executive Hotel home">
            <HotelLogo size={32} />
          </Link>
          <div className={styles.breadcrumb}>Customer relationship <span>/</span> <strong>Guest CRM</strong></div>
          <UserButton />
        </header>

        <div className={styles.content} id="guest-overview">
          <section className={styles.welcome}>
            <div>
              <p className={styles.eyebrow}>GUEST RELATIONSHIPS <span /> OCTOBER 2026</p>
              <h1>Know every guest, personally.</h1>
              <p>Guest history, preferences, and feedback together in one considered view.</p>
            </div>
            <button disabled title="Guest exports will be available when CRM reporting is implemented" type="button" className={styles.exportButton}><Icon name="arrow-down" size={15} /> Export guest list</button>
          </section>

          <section className={styles.metrics} aria-label="Guest relationship metrics">
            <article className={styles.metric}><span className={styles.metricLabel}>Guest profiles</span><strong>2,481</strong><small><b>+8.2%</b> this month</small><span className={`${styles.metricIcon} ${styles.metricBlue}`}><Icon name="users" size={17} /></span></article>
            <article className={styles.metric}><span className={styles.metricLabel}>Returning guests</span><strong>36.8%</strong><small><b>+4.1%</b> vs. last quarter</small><span className={`${styles.metricIcon} ${styles.metricGreen}`}><Icon name="arrow-up" size={17} /></span></article>
            <article className={styles.metric}><span className={styles.metricLabel}>VIP guests</span><strong>128</strong><small>Across <b>14 countries</b></small><span className={`${styles.metricIcon} ${styles.metricGold}`}><Icon name="star" size={17} /></span></article>
            <article className={styles.metric}><span className={styles.metricLabel}>Guest satisfaction</span><strong>4.8<span>/5</span></strong><small><b>Based on 186 reviews</b></small><span className={`${styles.metricIcon} ${styles.metricPurple}`}><Icon name="sparkles" size={17} /></span></article>
          </section>

          <section className={styles.insightGrid}>
            <article className={styles.segmentPanel} id="guest-segments">
              <div className={styles.sectionHeading}><div><span className={styles.sectionEyebrow}>YOUR GUEST COMMUNITY</span><h2>Guest segments</h2></div><a href="#guest-directory">Explore guests <Icon name="arrow-right" size={14} /></a></div>
              <div className={styles.segmentList}>
                <div><span className={`${styles.segmentIcon} ${styles.segmentVip}`}><Icon name="star" size={16} /></span><span><strong>VIP guests</strong><small>Personal touches, lasting loyalty</small></span><b>128</b></div>
                <div><span className={`${styles.segmentIcon} ${styles.segmentReturning}`}><Icon name="arrow-right" size={16} /></span><span><strong>Returning guests</strong><small>Two or more stays with us</small></span><b>914</b></div>
                <div><span className={`${styles.segmentIcon} ${styles.segmentCorporate}`}><Icon name="globe" size={16} /></span><span><strong>Corporate guests</strong><small>Business and partner accounts</small></span><b>346</b></div>
                <div><span className={`${styles.segmentIcon} ${styles.segmentNew}`}><Icon name="plus" size={16} /></span><span><strong>First-time guests</strong><small>Make a memorable first stay</small></span><b>1,093</b></div>
              </div>
            </article>

            <article className={styles.feedbackPanel} id="guest-feedback">
              <div className={styles.sectionHeading}><div><span className={styles.sectionEyebrow}>THEIR WORDS MATTER</span><h2>Recent feedback</h2></div><span className={styles.rating}><Icon name="star" size={14} /> 4.8</span></div>
              <blockquote>“The team remembered my room preference from my last visit. It made arriving after a long flight feel effortless.”</blockquote>
              <div className={styles.feedbackAuthor}><span className={styles.feedbackAvatar}>AM</span><span><strong>Amelia Morgan</strong><small>Returning guest · 8 stays</small></span><time>Today</time></div>
              <div className={styles.feedbackFooter}><span>From post-stay survey</span><a href="#guest-directory">View guest profile <Icon name="arrow-right" size={13} /></a></div>
            </article>
          </section>

          <section className={styles.directoryPanel} id="guest-directory">
            <div className={styles.directoryHeading}>
              <div><span className={styles.sectionEyebrow}>RELATIONSHIPS, NOT JUST RESERVATIONS</span><h2>Guest directory</h2><p>Guest profiles are sample records for this interface preview.</p></div>
              <label className={styles.search}>
                <Icon name="search" size={16} />
                <input aria-label="Search guest directory" onChange={(event) => setQuery(event.target.value)} placeholder="Search guests" value={query} />
              </label>
            </div>
            <div className={styles.segmentFilters} aria-label="Filter guests by segment">
              {segments.map((segment) => (
                <button
                  aria-pressed={selectedSegment === segment}
                  className={selectedSegment === segment ? styles.filterActive : styles.filterButton}
                  key={segment}
                  onClick={() => setSelectedSegment(segment)}
                  type="button"
                >
                  {segment}
                </button>
              ))}
            </div>
            <div className={styles.tableScroller}>
              <table className={styles.guestTable}>
                <thead><tr><th>GUEST</th><th>LOCATION</th><th>STAYS</th><th>LAST VISIT</th><th>LIFETIME VALUE</th><th>SEGMENT</th></tr></thead>
                <tbody>
                  {visibleGuests.map((guest) => (
                    <tr key={guest.email}>
                      <td><div className={styles.guestCell}><span className={styles.guestAvatar}>{guest.initials}</span><span><strong>{guest.name}</strong><small>{guest.email}</small></span></div></td>
                      <td>{guest.country}</td>
                      <td>{guest.visits}</td>
                      <td>{guest.lastStay}</td>
                      <td><strong className={styles.value}>{guest.lifetimeValue}</strong></td>
                      <td><span className={`${styles.segmentBadge} ${styles[`badge${guest.segment}`]}`}>{guest.segment}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleGuests.length === 0 && <p className={styles.emptyState}>No guest profiles match these filters.</p>}
            </div>
          </section>
          <footer className={styles.footer}><span>Guest CRM</span><span>Sample guest records · Private customer data should be access-controlled.</span></footer>
        </div>
      </section>
    </main>
  );
}
