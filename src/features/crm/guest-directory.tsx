"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { CrmGuestProfile, GuestSegment } from "./crm-data-server";
import { displaySegment } from "./crm-data-server";
import { GuestProfileForm } from "./guest-profile-form";
import styles from "./crm-dashboard.module.css";

const segments: ("All guests" | GuestSegment)[] = ["All guests", "vip", "returning", "corporate", "new"];
const segmentLabels: Record<(typeof segments)[number], string> = {
  "All guests": "All guests",
  vip: "VIP",
  returning: "Returning",
  corporate: "Corporate",
  new: "New",
};

function statusLabel(status: "reserved" | "checked_in" | "checked_out" | "cancelled"): string {
  if (status === "checked_in") return "Checked in";
  if (status === "checked_out") return "Checked out";
  if (status === "cancelled") return "Cancelled";
  return "Reserved";
}

export function GuestDirectory({ directory }: { directory: CrmGuestProfile[] }) {
  const [query, setQuery] = useState("");
  const [selectedSegment, setSelectedSegment] = useState<(typeof segments)[number]>("All guests");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visibleGuests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return directory.filter((guest) => {
      const matchesSegment = selectedSegment === "All guests" || guest.segment === selectedSegment;
      const haystack = `${guest.name} ${guest.email} ${guest.phone} ${guest.country} ${displaySegment(guest.segment)} ${guest.notes ?? ""}`.toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      return matchesSegment && matchesQuery;
    });
  }, [query, selectedSegment, directory]);

  const effectiveSelectedId = selectedId && directory.some((g) => g.id === selectedId) ? selectedId : null;
  const selected = effectiveSelectedId ? directory.find((g) => g.id === effectiveSelectedId) ?? null : null;

  return (
    <section className={styles.directoryPanel} id="guest-directory">
      <div className={styles.directoryHeading}>
        <div>
          <span className={styles.sectionEyebrow}>RELATIONSHIPS, NOT JUST RESERVATIONS</span>
          <h2>Guest directory</h2>
          <p>Search, filter, and manage guest profiles, segments, and notes.</p>
        </div>
        <label className={styles.search}>
          <Icon name="search" size={16} />
          <input aria-label="Search guest directory" onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone, notes" value={query} />
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

      <div className={styles.directoryLayout}>
        <div className={styles.directoryListPane}>
          <div className={styles.directoryMeta}>
            <span>{visibleGuests.length} of {directory.length} guests</span>
            {selectedSegment !== "All guests" && <span>· {segmentLabels[selectedSegment]} segment</span>}
          </div>

          {directory.length === 0 ? (
            <p className={styles.emptyState}>No guest profiles yet. Guest records are created when reservations are added.</p>
          ) : (
            <div className={styles.tableScroller}>
              <table className={styles.guestTable}>
                <thead><tr><th>GUEST</th><th>CONTACT</th><th>STAYS</th><th>LAST VISIT</th><th>VALUE</th><th>SEGMENT</th></tr></thead>
                <tbody>
                  {visibleGuests.map((guest) => (
                    <tr
                      key={guest.id}
                      className={guest.id === effectiveSelectedId ? styles.selectedRow : undefined}
                      onClick={() => setSelectedId(guest.id)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(guest.id); } }}
                      tabIndex={0}
                      aria-selected={guest.id === effectiveSelectedId}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <div className={styles.guestCell}>
                          <span className={styles.guestAvatar}>{guest.initials}</span>
                          <span><strong>{guest.name}</strong><small>{guest.country}</small></span>
                        </div>
                      </td>
                      <td><div style={{ display: "grid", gap: 2 }}><span>{guest.email}</span><small style={{ color: "var(--subtle)", fontSize: 10 }}>{guest.phone}</small></div></td>
                      <td>{guest.visits}</td>
                      <td>{guest.lastStay}</td>
                      <td><strong className={styles.value}>{guest.lifetimeValue}</strong></td>
                      <td><span className={`${styles.segmentBadge} ${styles[`badge${displaySegment(guest.segment)}`]}`}>{displaySegment(guest.segment)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleGuests.length === 0 && <p className={styles.emptyState}>No guest profiles match these filters.</p>}
            </div>
          )}
        </div>

        <aside className={styles.profilePane} aria-label="Guest profile">
          {!selected ? (
            <div className={styles.profileEmpty}>
              <Icon name="users" size={22} />
              <strong>Select a guest</strong>
              <p>Choose a guest from the directory to view stay history and update their profile, segment, or notes.</p>
            </div>
          ) : (
            <div className={styles.profileCard} key={selected.id}>
              <div className={styles.profileHeader}>
                <span className={styles.profileAvatar}>{selected.initials}</span>
                <div>
                  <strong>{selected.name}</strong>
                  <span><span className={`${styles.segmentBadge} ${styles[`badge${displaySegment(selected.segment)}`]}`}>{displaySegment(selected.segment)}</span></span>
                </div>
                <button type="button" className="row-action" onClick={() => setSelectedId(null)} aria-label="Close profile">Close</button>
              </div>

              <div className={styles.profileStats}>
                <div><span>Stays</span><strong>{selected.visits}</strong></div>
                <div><span>Last visit</span><strong>{selected.lastStay}</strong></div>
                <div><span>Lifetime value</span><strong>{selected.lifetimeValue}</strong></div>
              </div>

              <div className={styles.profileDivider} />
              <h3 className={styles.profileSectionTitle}>Contact & details</h3>
              <div className={styles.profileContact}>
                <div><span>Email</span><strong>{selected.email}</strong></div>
                <div><span>Phone</span><strong>{selected.phone}</strong></div>
                <div><span>Country</span><strong>{selected.country}</strong></div>
              </div>

              <div className={styles.profileDivider} />
              <h3 className={styles.profileSectionTitle}>Stay history</h3>
              {selected.reservations.length === 0 ? (
                <p className={styles.emptyState} style={{ textAlign: "left", padding: "8px 0" }}>No reservation history yet.</p>
              ) : (
                <div className={styles.historyList}>
                  {selected.reservations.map((r) => (
                    <div key={r.id} className={styles.historyItem}>
                      <div className={styles.historyTop}>
                        <strong>{r.reference}</strong>
                        <span className={`${styles.historyStatus} ${styles[`status_${r.status}`] ?? ""}`}>{statusLabel(r.status)}</span>
                      </div>
                      <div className={styles.historyMeta}>
                        <span>Room {r.roomNumber} · {r.roomType}</span>
                        <span>{r.checkIn} → {r.checkOut} · {r.nights} night{r.nights === 1 ? "" : "s"}</span>
                        <span>{r.source}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.profileDivider} />
              <h3 className={styles.profileSectionTitle}>Edit profile & notes</h3>
              <GuestProfileForm guest={selected} />
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
