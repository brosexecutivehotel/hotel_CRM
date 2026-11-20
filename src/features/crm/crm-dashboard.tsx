"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Icon } from "@/components/ui/icon";
import { HotelLogo } from "@/components/brand/hotel-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DashboardSwitcher } from "@/components/ui/dashboard-switcher";
import type { DashboardRole } from "@/lib/auth/roles";
import type { CrmData, GuestSegment } from "./crm-data-server";
import { displaySegment } from "./crm-data-server";
import styles from "./crm-dashboard.module.css";

const segments: ("All guests" | GuestSegment)[] = ["All guests", "vip", "returning", "corporate", "new"];
const segmentLabels: Record<(typeof segments)[number], string> = {
  "All guests": "All guests",
  vip: "VIP",
  returning: "Returning",
  corporate: "Corporate",
  new: "New",
};

export default function CrmDashboard({ viewerRole, data }: { viewerRole?: DashboardRole; data: CrmData }) {
  const [query, setQuery] = useState("");
  const [selectedSegment, setSelectedSegment] = useState<(typeof segments)[number]>("All guests");

  const visibleGuests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return data.directory.filter((guest) => {
      const matchesSegment = selectedSegment === "All guests" || guest.segment === selectedSegment;
      const matchesQuery =
        !normalizedQuery ||
        `${guest.name} ${guest.email} ${guest.country} ${displaySegment(guest.segment)}`.toLowerCase().includes(normalizedQuery);
      return matchesSegment && matchesQuery;
    });
  }, [query, selectedSegment, data.directory]);

  const m = data.metrics;

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
          <a className={styles.sideNavLink} href="#guest-feedback"><Icon name="sparkles" size={17} /> Guest notes</a>
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
          {viewerRole === "management" && <DashboardSwitcher viewerRole={viewerRole} current="crm" />}
          <ThemeToggle />
          <UserButton />
        </header>

        <div className={styles.content} id="guest-overview">
          <section className={styles.welcome}>
            <div>
              <p className={styles.eyebrow}>GUEST RELATIONSHIPS <span /> LIVE DATA</p>
              <h1>Know every guest, personally.</h1>
              <p>Guest profiles, segments, and stay history from your reservations.</p>
            </div>
          </section>

          <section className={styles.metrics} aria-label="Guest relationship metrics">
            <article className={styles.metric}><span className={styles.metricLabel}>Guest profiles</span><strong>{m.totalGuests.toLocaleString()}</strong><small><b>{m.newGuests}</b> new segment profiles</small><span className={`${styles.metricIcon} ${styles.metricBlue}`}><Icon name="users" size={17} /></span></article>
            <article className={styles.metric}><span className={styles.metricLabel}>Repeat guests</span><strong>{m.repeatRate}%</strong><small><b>{m.repeatGuests}</b> guests with return stays</small><span className={`${styles.metricIcon} ${styles.metricGreen}`}><Icon name="arrow-up" size={17} /></span></article>
            <article className={styles.metric}><span className={styles.metricLabel}>VIP guests</span><strong>{m.vipGuests}</strong><small>Across <b>{m.countries} countries</b></small><span className={`${styles.metricIcon} ${styles.metricGold}`}><Icon name="star" size={17} /></span></article>
            <article className={styles.metric}><span className={styles.metricLabel}>Lifetime value</span><strong style={{ fontSize: 22 }}>{m.totalLifetimeValue}</strong><small><b>Paid revenue</b> linked to guests</small><span className={`${styles.metricIcon} ${styles.metricPurple}`}><Icon name="wallet" size={17} /></span></article>
          </section>

          <section className={styles.insightGrid}>
            <article className={styles.segmentPanel} id="guest-segments">
              <div className={styles.sectionHeading}><div><span className={styles.sectionEyebrow}>YOUR GUEST COMMUNITY</span><h2>Guest segments</h2></div><a href="#guest-directory">Explore guests <Icon name="arrow-right" size={14} /></a></div>
              <div className={styles.segmentList}>
                <div><span className={`${styles.segmentIcon} ${styles.segmentVip}`}><Icon name="star" size={16} /></span><span><strong>VIP guests</strong><small>Personal touches, lasting loyalty</small></span><b>{data.segmentCounts.vip}</b></div>
                <div><span className={`${styles.segmentIcon} ${styles.segmentReturning}`}><Icon name="arrow-right" size={16} /></span><span><strong>Returning guests</strong><small>Two or more stays with us</small></span><b>{data.segmentCounts.returning}</b></div>
                <div><span className={`${styles.segmentIcon} ${styles.segmentCorporate}`}><Icon name="globe" size={16} /></span><span><strong>Corporate guests</strong><small>Business and partner accounts</small></span><b>{data.segmentCounts.corporate}</b></div>
                <div><span className={`${styles.segmentIcon} ${styles.segmentNew}`}><Icon name="plus" size={16} /></span><span><strong>First-time guests</strong><small>Make a memorable first stay</small></span><b>{data.segmentCounts.new}</b></div>
              </div>
            </article>

            <article className={styles.feedbackPanel} id="guest-feedback">
              <div className={styles.sectionHeading}><div><span className={styles.sectionEyebrow}>PREFERENCES & CONTEXT</span><h2>Recent guest notes</h2></div></div>
              {data.recentNotes.length === 0 ? (
                <p className={styles.emptyState} style={{ textAlign: "left", paddingTop: 16 }}>No guest notes yet. Add notes to guest profiles from reservations to capture preferences and context here.</p>
              ) : (
                <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                  {data.recentNotes.map((note) => (
                    <div key={note.id} style={{ paddingBottom: 12, borderBottom: "1px solid var(--line-soft)" }}>
                      <blockquote style={{ margin: "0 0 8px", color: "var(--ink)", fontSize: 13, fontWeight: 500, lineHeight: 1.6 }}>“{note.notes}”</blockquote>
                      <div className={styles.feedbackAuthor}><span className={styles.feedbackAvatar}>{initials(note.name)}</span><span><strong>{note.name}</strong><small>{displaySegment(note.segment)} guest</small></span><time>{note.updatedAt}</time></div>
                    </div>
                  ))}
                </div>
              )}
              <div className={styles.feedbackFooter}><span>From guest profile notes</span><a href="#guest-directory">View guest directory <Icon name="arrow-right" size={13} /></a></div>
            </article>
          </section>

          <section className={styles.directoryPanel} id="guest-directory">
            <div className={styles.directoryHeading}>
              <div><span className={styles.sectionEyebrow}>RELATIONSHIPS, NOT JUST RESERVATIONS</span><h2>Guest directory</h2><p>Live guest profiles derived from reservations and payments.</p></div>
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
                  {segmentLabels[segment]}
                </button>
              ))}
            </div>
            <div className={styles.tableScroller}>
              {data.directory.length === 0 ? (
                <p className={styles.emptyState}>No guest profiles yet. Guest records are created when reservations are added.</p>
              ) : (
                <table className={styles.guestTable}>
                  <thead><tr><th>GUEST</th><th>LOCATION</th><th>STAYS</th><th>LAST VISIT</th><th>LIFETIME VALUE</th><th>SEGMENT</th></tr></thead>
                  <tbody>
                    {visibleGuests.map((guest) => (
                      <tr key={guest.id}>
                        <td><div className={styles.guestCell}><span className={styles.guestAvatar}>{guest.initials}</span><span><strong>{guest.name}</strong><small>{guest.email}</small></span></div></td>
                        <td>{guest.country}</td>
                        <td>{guest.visits}</td>
                        <td>{guest.lastStay}</td>
                        <td><strong className={styles.value}>{guest.lifetimeValue}</strong></td>
                        <td><span className={`${styles.segmentBadge} ${styles[`badge${displaySegment(guest.segment)}`]}`}>{displaySegment(guest.segment)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {data.directory.length > 0 && visibleGuests.length === 0 && <p className={styles.emptyState}>No guest profiles match these filters.</p>}
            </div>
          </section>
          <footer className={styles.footer}><span>Guest CRM</span><span>Live guest records · Access controlled by assigned role.</span></footer>
        </div>
      </section>
    </main>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
