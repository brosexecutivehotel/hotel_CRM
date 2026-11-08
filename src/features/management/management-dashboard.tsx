"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { HotelLogo } from "@/components/brand/hotel-logo";
import { Icon } from "@/components/ui/icon";
import {
  activities,
  arrivals,
  chartSets,
  managementNavigation as navigation,
  type ChartRange,
} from "./management-data";

export default function DashboardPage() {
  const activeNav = "Overview";
  const [chartRange, setChartRange] = useState<ChartRange>("Week");
  const [search, setSearch] = useState("");

  const filteredArrivals = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return arrivals;
    return arrivals.filter((guest) =>
      `${guest.name} ${guest.detail} ${guest.room} ${guest.status}`.toLowerCase().includes(query),
    );
  }, [search]);

  const chart = chartSets[chartRange];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/management" aria-label="Bros Executive Hotel home">
          <HotelLogo className="brand-logo" size={42} />
          <span className="brand-copy">
            <strong>BROS EXECUTIVE</strong>
            <span>HOTEL OPERATIONS</span>
          </span>
        </Link>

        <div className="property-switcher">
          <span className="property-icon"><Icon name="bed" size={17} /></span>
          <span className="property-copy"><strong>Main property</strong><small>Juba, South Sudan</small></span>
          <Icon name="chevron" size={15} />
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <div key={item.label}>
              {item.section && <p className="nav-section">{item.section}</p>}
              {item.href ? (
                <Link
                  className={`nav-link${activeNav === item.label ? " nav-link--active" : ""}`}
                  href={item.href}
                  aria-current={activeNav === item.label ? "page" : undefined}
                >
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  className="nav-link nav-link--planned"
                  disabled
                  title="Planned module"
                  aria-label={`${item.label}, planned module`}
                >
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                  {item.label === "Reservations" && <span className="nav-count">8</span>}
                </button>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon"><Icon name="sparkles" size={16} /></span>
            <div><strong>Need a hand?</strong><span>Visit the team help desk</span></div>
            <Icon name="chevron" size={15} />
          </div>
          <div className="profile-button">
            <UserButton />
            <span className="profile-copy"><strong>Signed in</strong><small>Hotel staff account</small></span>
          </div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <HotelLogo className="mobile-brand-logo" size={32} />
          <div className="breadcrumb"><span>Workspace</span><Icon name="chevron" size={14} /><strong>{activeNav}</strong></div>
          <div className="topbar-actions">
            <label className="search-box">
              <Icon name="search" size={17} />
              <input
                aria-label="Search today's arrivals"
                placeholder="Search today’s arrivals..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <kbd>⌘ K</kbd>
            </label>
            <span className="icon-button notification-button" aria-label="Notifications">
              <Icon name="bell" size={18} /><span className="notification-dot" />
            </span>
            <span className="topbar-divider" />
            <div className="date-display"><span>Friday, 31 October 2026</span><small>Hotel local time · EAT</small></div>
          </div>
        </header>

        <div className="dashboard-content">
          <div className="welcome-row">
            <div>
              <p className="eyebrow">FRIDAY, OCTOBER 31, 2026 <span className="live-dot" /> TODAY AT A GLANCE</p>
              <h1>Good morning, James <span className="wave">✦</span></h1>
              <p className="welcome-subtitle">Here’s what’s happening across your hotel today.</p>
            </div>
            <div className="date-filter"><Icon name="calendar" size={17} /><span>Today, Oct 31</span><Icon name="chevron" size={14} /></div>
          </div>

          <section className="metric-grid" aria-label="Today's key metrics">
            <article className="metric-card">
              <div className="metric-top"><span className="metric-label">Occupancy</span><span className="metric-icon metric-icon--blue"><Icon name="bed" size={19} /></span></div>
              <div className="metric-value">78.4<span className="metric-unit">%</span></div>
              <div className="metric-foot"><span className="trend trend--up"><Icon name="arrow-up" size={13} /> 6.2%</span><span>vs. last week</span><span className="metric-side">98 / 125 rooms</span></div>
              <div className="metric-progress"><span style={{ width: "78.4%" }} /></div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span className="metric-label">Arrivals today</span><span className="metric-icon metric-icon--violet"><Icon name="arrow-down" size={19} /></span></div>
              <div className="metric-value">14</div>
              <div className="metric-foot"><span className="metric-muted">5 checked in</span><span className="metric-side">9 expected</span></div>
              <div className="metric-mini-avatars"><span>AM</span><span>SO</span><span>JW</span><span>+6</span></div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span className="metric-label">Departures today</span><span className="metric-icon metric-icon--amber"><Icon name="arrow-up" size={19} /></span></div>
              <div className="metric-value">9</div>
              <div className="metric-foot"><span className="metric-muted">4 checked out</span><span className="metric-side">5 expected</span></div>
              <div className="departure-note"><Icon name="clock" size={14} /> Next checkout at 11:00 AM</div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span className="metric-label">Revenue today</span><span className="metric-icon metric-icon--green"><Icon name="wallet" size={19} /></span></div>
              <div className="metric-value metric-value--money"><span className="currency-symbol">$</span> 4,820</div>
              <div className="metric-foot"><span className="trend trend--up"><Icon name="arrow-up" size={13} /> 12.8%</span><span>vs. yesterday</span><span className="metric-side">USD</span></div>
              <div className="revenue-sparkline" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
            </article>
          </section>

          <section className="overview-grid">
            <article className="panel revenue-panel">
              <div className="panel-heading">
                <div><h2>Revenue overview</h2><p>Track your hotel’s performance over time</p></div>
                <div className="range-switch" role="group" aria-label="Revenue chart range">
                  {(["Week", "Month", "Year"] as ChartRange[]).map((range) => (
                    <button key={range} type="button" className={chartRange === range ? "range-active" : ""} onClick={() => setChartRange(range)}>{range}</button>
                  ))}
                </div>
              </div>
              <div className="chart-summary"><strong>$ 38,640</strong><span className="trend trend--up"><Icon name="arrow-up" size={13} /> 8.4%</span><small>compared to previous {chartRange.toLowerCase()}</small></div>
              <div className="chart" role="img" aria-label={`${chartRange} revenue trend chart`}>
                <div className="chart-y-labels"><span>$8k</span><span>$6k</span><span>$4k</span><span>$2k</span><span>$0</span></div>
                <div className="chart-plot">
                  <div className="chart-gridlines"><i /><i /><i /><i /><i /></div>
                  <div className="chart-bars">
                    {chart.values.map((value, index) => (
                      <div className="chart-bar-column" key={`${chartRange}-${index}`}>
                        <span className={`chart-bar${index === chart.values.length - 2 ? " chart-bar--highlight" : ""}`} style={{ height: `${value}%` }} />
                      </div>
                    ))}
                  </div>
                  <div className="chart-x-labels">{chart.labels.map((label) => <span key={label}>{label}</span>)}</div>
                </div>
              </div>
              <div className="chart-legend"><span><i className="legend-dot legend-dot--blue" />Room revenue</span><span><i className="legend-dot legend-dot--light" />Other income</span></div>
            </article>

            <article className="panel room-panel">
              <div className="panel-heading">
                <div><h2>Room status</h2><p>Live inventory across the property</p></div>
                <button type="button" className="subtle-icon-button" aria-label="Room status options"><Icon name="more" size={19} /></button>
              </div>
              <div className="room-total"><strong>125</strong><span>Total rooms</span><span className="room-total-badge">100% inventory</span></div>
              <div className="room-status-list">
                <div className="room-status-row"><span className="status-name"><i className="status-dot status-dot--occupied" />Occupied</span><strong>98 <small>rooms</small></strong><span className="status-percent">78.4%</span></div>
                <div className="room-status-row"><span className="status-name"><i className="status-dot status-dot--ready" />Ready</span><strong>18 <small>rooms</small></strong><span className="status-percent">14.4%</span></div>
                <div className="room-status-row"><span className="status-name"><i className="status-dot status-dot--cleaning" />Cleaning</span><strong>6 <small>rooms</small></strong><span className="status-percent">4.8%</span></div>
                <div className="room-status-row"><span className="status-name"><i className="status-dot status-dot--maintenance" />Maintenance</span><strong>3 <small>rooms</small></strong><span className="status-percent">2.4%</span></div>
              </div>
              <div className="occupancy-banner"><span className="occupancy-ring"><Icon name="bed" size={16} /></span><span><strong>Strong occupancy today</strong><small>Occupancy is up 6.2% from last week</small></span><Icon name="chevron" size={16} /></div>
            </article>
          </section>

          <section className="bottom-grid">
            <article className="panel arrivals-panel">
              <div className="panel-heading">
                <div><h2>Today’s arrivals <span className="heading-count">14</span></h2><p>Guests expected to check in today</p></div>
                <span className="text-button">Reservations <Icon name="chevron" size={14} /></span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>GUEST</th><th>ROOM</th><th>ARRIVAL</th><th>STATUS</th></tr></thead>
                  <tbody>
                    {filteredArrivals.map((guest, index) => (
                      <tr key={guest.name}>
                        <td><div className="guest-cell"><span className={`avatar avatar--${index % 3}`}>{guest.initials}</span><span><strong>{guest.name}</strong><small>{guest.detail}</small></span></div></td>
                        <td><span className="room-number">#{guest.room}</span></td>
                        <td><span className="arrival-time">{guest.time}</span></td>
                        <td><span className={`status-pill${guest.status === "Checked in" ? " status-pill--checked" : ""}`}><i />{guest.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredArrivals.length === 0 && <p className="empty-search">No arrivals match “{search}”.</p>}
              </div>
              <span className="mobile-view-all">14 arrivals today <Icon name="chevron" size={15} /></span>
            </article>

            <article className="panel activity-panel">
              <div className="panel-heading">
                <div><h2>Recent activity</h2><p>Latest updates from your team</p></div>
                <button type="button" className="subtle-icon-button" aria-label="Activity options"><Icon name="more" size={19} /></button>
              </div>
              <div className="activity-list">
                {activities.map((activity) => (
                  <div className="activity-item" key={activity.title}>
                    <span className={`activity-icon activity-icon--${activity.tone}`}><Icon name={activity.icon} size={15} /></span>
                    <span className="activity-copy"><strong>{activity.title}</strong><small>{activity.detail}</small></span>
                    <time>{activity.time}</time>
                  </div>
                ))}
              </div>
              <span className="activity-link">Activity log <Icon name="chevron" size={14} /></span>
            </article>
          </section>

          <footer className="dashboard-footer"><span>© 2026 Bros Executive Hotel</span><span>Operational data shown is sample content for the initial dashboard.</span><button type="button">System status <i /></button></footer>
        </div>
      </section>
    </main>
  );
}
