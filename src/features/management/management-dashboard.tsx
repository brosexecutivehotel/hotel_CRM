"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ManagementShell } from "./management-shell";
import type { ChartRange, OverviewData } from "./overview-data";

type Props = {
  userName: string;
  overview: OverviewData;
};

function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function greetingForHour(isoHour: number): string {
  if (isoHour < 12) return "Good morning";
  if (isoHour < 17) return "Good afternoon";
  return "Good evening";
}

export default function ManagementDashboard({ userName, overview }: Props) {
  const [chartRange, setChartRange] = useState<ChartRange>("Week");
  const [search, setSearch] = useState("");

  const filteredArrivals = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return overview.arrivals.items;
    return overview.arrivals.items.filter((guest) =>
      `${guest.name} ${guest.detail} ${guest.room} ${guest.status}`.toLowerCase().includes(query),
    );
  }, [search, overview.arrivals.items]);

  const chart = overview.chartSets[chartRange];
  const { rooms, arrivals, departures, revenueToday, today } = overview;
  const occ = rooms.occupancyPercent;
  const occWidth = `${Math.min(100, Math.max(0, occ))}%`;

  // Derive a friendly greeting from current local hour approximation via passed time string
  const hourMatch = today.time.match(/^(\d+):/);
  const hourNum = hourMatch ? parseInt(hourMatch[1]!, 10) : 9;
  const isPm = /PM/i.test(today.time);
  const hour24 = isPm && hourNum !== 12 ? hourNum + 12 : !isPm && hourNum === 12 ? 0 : hourNum;
  const greeting = greetingForHour(hour24);

  const chartHasData = chart.values.some((v) => v > 0);

  return (
    <ManagementShell
      activeNav="Overview"
      dateLabel={today.long}
      timeLabel={`${today.time} · EAT`}
      topbarActions={
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
      }
    >
      <div className="welcome-row">
        <div>
          <p className="eyebrow">
            {today.long.toUpperCase()} <span className="live-dot" /> TODAY AT A GLANCE
          </p>
          <h1>
            {greeting}, {userName} <span className="wave">✦</span>
          </h1>
          <p className="welcome-subtitle">Here’s what’s happening across your hotel today.</p>
        </div>
        <div className="date-filter">
          <Icon name="calendar" size={17} />
          <span>{today.short}</span>
          <Icon name="chevron" size={14} />
        </div>
      </div>

      <section className="metric-grid" aria-label="Today's key metrics">
        <article className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Occupancy</span>
            <span className="metric-icon metric-icon--blue"><Icon name="bed" size={19} /></span>
          </div>
          <div className="metric-value">
            {rooms.total > 0 ? occ.toFixed(1) : "—"}
            {rooms.total > 0 && <span className="metric-unit">%</span>}
          </div>
          <div className="metric-foot">
            {rooms.total > 0 ? (
              <>
                <span className="metric-muted">Occupied rooms</span>
                <span className="metric-side">{rooms.counts.occupied} / {rooms.total} rooms</span>
              </>
            ) : (
              <span className="metric-muted">Add rooms to track occupancy</span>
            )}
          </div>
          <div className="metric-progress"><span style={{ width: occWidth }} /></div>
        </article>

        <article className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Arrivals today</span>
            <span className="metric-icon metric-icon--violet"><Icon name="arrow-down" size={19} /></span>
          </div>
          <div className="metric-value">{arrivals.total}</div>
          <div className="metric-foot">
            <span className="metric-muted">{arrivals.checkedIn} checked in</span>
            <span className="metric-side">{arrivals.expected} expected</span>
          </div>
          {arrivals.items.length > 0 && (
            <div className="metric-mini-avatars">
              {arrivals.items.slice(0, 3).map((a) => (
                <span key={a.name + a.room}>{a.initials}</span>
              ))}
              {arrivals.items.length > 3 && <span>+{arrivals.items.length - 3}</span>}
            </div>
          )}
        </article>

        <article className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Departures today</span>
            <span className="metric-icon metric-icon--amber"><Icon name="arrow-up" size={19} /></span>
          </div>
          <div className="metric-value">{departures.total}</div>
          <div className="metric-foot">
            <span className="metric-muted">{departures.checkedOut} checked out</span>
            <span className="metric-side">{departures.expected} expected</span>
          </div>
          <div className="departure-note"><Icon name="clock" size={14} /> Checkout 11:00 AM</div>
        </article>

        <article className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Revenue today</span>
            <span className="metric-icon metric-icon--green"><Icon name="wallet" size={19} /></span>
          </div>
          <div className="metric-value metric-value--money">
            <span className="currency-symbol">$</span> {formatMoney(revenueToday)}
          </div>
          <div className="metric-foot">
            <span className="metric-muted">Recorded payments today</span>
            <span className="metric-side">USD</span>
          </div>
          <div className="revenue-sparkline" aria-hidden="true">
            <span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span />
          </div>
        </article>
      </section>

      <section className="overview-grid">
        <article className="panel revenue-panel">
          <div className="panel-heading">
            <div><h2>Revenue overview</h2><p>Track your hotel’s performance over time</p></div>
            <div className="range-switch" role="group" aria-label="Revenue chart range">
              {(["Week", "Month", "Year"] as ChartRange[]).map((range) => (
                <button
                  key={range}
                  type="button"
                  className={chartRange === range ? "range-active" : ""}
                  onClick={() => setChartRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-summary">
            <strong>$ {formatMoney(0)}</strong>
            <small>{chartHasData ? `compared to previous ${chartRange.toLowerCase()}` : "No revenue data yet"}</small>
          </div>
          <div className="chart" role="img" aria-label={`${chartRange} revenue trend chart`}>
            <div className="chart-y-labels"><span>$8k</span><span>$6k</span><span>$4k</span><span>$2k</span><span>$0</span></div>
            <div className="chart-plot">
              <div className="chart-gridlines"><i /><i /><i /><i /><i /></div>
              <div className="chart-bars">
                {chart.values.map((value, index) => (
                  <div className="chart-bar-column" key={`${chartRange}-${index}`}>
                    <span
                      className={`chart-bar${index === chart.values.length - 2 ? " chart-bar--highlight" : ""}`}
                      style={{ height: `${value}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="chart-x-labels">
                {chart.labels.map((label) => <span key={label}>{label}</span>)}
              </div>
            </div>
          </div>
          <div className="chart-legend">
            <span><i className="legend-dot legend-dot--blue" />Room revenue</span>
            <span><i className="legend-dot legend-dot--light" />Other income</span>
          </div>
        </article>

        <article className="panel room-panel">
          <div className="panel-heading">
            <div><h2>Room status</h2><p>Live inventory across the property</p></div>
          </div>
          <div className="room-total">
            <strong>{rooms.total}</strong><span>Total rooms</span>
            <span className="room-total-badge">{rooms.total > 0 ? "Live inventory" : "No rooms yet"}</span>
          </div>
          <div className="room-status-list">
            <div className="room-status-row">
              <span className="status-name"><i className="status-dot status-dot--occupied" />Occupied</span>
              <strong>{rooms.counts.occupied} <small>rooms</small></strong>
              <span className="status-percent">{rooms.total ? `${((rooms.counts.occupied / rooms.total) * 100).toFixed(1)}%` : "—"}</span>
            </div>
            <div className="room-status-row">
              <span className="status-name"><i className="status-dot status-dot--ready" />Ready</span>
              <strong>{rooms.counts.ready} <small>rooms</small></strong>
              <span className="status-percent">{rooms.total ? `${((rooms.counts.ready / rooms.total) * 100).toFixed(1)}%` : "—"}</span>
            </div>
            <div className="room-status-row">
              <span className="status-name"><i className="status-dot status-dot--cleaning" />Cleaning</span>
              <strong>{rooms.counts.cleaning} <small>rooms</small></strong>
              <span className="status-percent">{rooms.total ? `${((rooms.counts.cleaning / rooms.total) * 100).toFixed(1)}%` : "—"}</span>
            </div>
            <div className="room-status-row">
              <span className="status-name"><i className="status-dot status-dot--maintenance" />Maintenance</span>
              <strong>{rooms.counts.maintenance} <small>rooms</small></strong>
              <span className="status-percent">{rooms.total ? `${((rooms.counts.maintenance / rooms.total) * 100).toFixed(1)}%` : "—"}</span>
            </div>
          </div>
          <div className="occupancy-banner">
            <span className="occupancy-ring"><Icon name="bed" size={16} /></span>
            <span>
              <strong>{rooms.total > 0 ? `${occ.toFixed(1)}% occupancy` : "Set up your room inventory"}</strong>
              <small>
                {rooms.total > 0
                  ? `${rooms.counts.occupied} of ${rooms.total} rooms currently occupied`
                  : "Go to Rooms to add your property’s rooms"}
              </small>
            </span>
            <Icon name="chevron" size={16} />
          </div>
        </article>
      </section>

      <section className="bottom-grid">
        <article className="panel arrivals-panel">
          <div className="panel-heading">
            <div>
              <h2>Today’s arrivals <span className="heading-count">{arrivals.total}</span></h2>
              <p>Guests expected to check in today</p>
            </div>
            <span className="text-button">Reservations <Icon name="chevron" size={14} /></span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>GUEST</th><th>ROOM</th><th>ARRIVAL</th><th>STATUS</th></tr></thead>
              <tbody>
                {filteredArrivals.map((guest, index) => (
                  <tr key={`${guest.name}-${guest.room}-${index}`}>
                    <td>
                      <div className="guest-cell">
                        <span className={`avatar avatar--${index % 3}`}>{guest.initials}</span>
                        <span><strong>{guest.name}</strong><small>{guest.detail}</small></span>
                      </div>
                    </td>
                    <td><span className="room-number">#{guest.room}</span></td>
                    <td><span className="arrival-time">{guest.time}</span></td>
                    <td>
                      <span className={`status-pill${guest.status === "Checked in" ? " status-pill--checked" : ""}`}>
                        <i />{guest.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredArrivals.length === 0 && arrivals.items.length === 0 && (
              <p className="empty-search">No arrivals scheduled for today.</p>
            )}
            {filteredArrivals.length === 0 && arrivals.items.length > 0 && (
              <p className="empty-search">No arrivals match “{search}”.</p>
            )}
          </div>
          <span className="mobile-view-all">{arrivals.total} arrivals today <Icon name="chevron" size={15} /></span>
        </article>

        <article className="panel activity-panel">
          <div className="panel-heading">
            <div><h2>Recent activity</h2><p>Latest updates from your team</p></div>
          </div>
          <div className="activity-list">
            {overview.recentActivity.length === 0 && (
              <p className="empty-search">No recent activity yet.</p>
            )}
            {overview.recentActivity.map((activity, index) => (
              <div className="activity-item" key={`${activity.title}-${index}`}>
                <span className={`activity-icon activity-icon--${activity.tone}`}>
                  <Icon name={activity.icon} size={15} />
                </span>
                <span className="activity-copy"><strong>{activity.title}</strong><small>{activity.detail}</small></span>
                <time>{activity.time}</time>
              </div>
            ))}
          </div>
          <span className="activity-link">Activity log <Icon name="chevron" size={14} /></span>
        </article>
      </section>

      <footer className="dashboard-footer">
        <span>© 2026 Bros Executive Hotel</span>
        <span>Overview · Live operational data</span>
        <button type="button">System status <i /></button>
      </footer>
    </ManagementShell>
  );
}
