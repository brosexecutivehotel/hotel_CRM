import type { Metadata } from "next";
import Link from "next/link";
import { requireDashboardRole } from "@/lib/auth/roles";
import { ManagementShell } from "@/features/management/management-shell";
import {
  getReportsData,
  resolveReportParams,
  REPORT_PAY_METHODS,
  REPORT_PAY_STATUSES,
  REPORT_RES_SOURCES,
  REPORT_RES_STATUSES,
  type ReportsData,
  type SortDir,
  type SortKey,
} from "@/features/management/reports/reports-data";

export const metadata: Metadata = {
  title: "Reports",
  description: "Operational summary reports for the hotel.",
};

function money(v: number) {
  return `USD ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function sourceLabel(s: string) {
  if (s === "booking_com") return "Booking.com";
  if (s === "walk_in") return "Walk-in";
  return titleCase(s.replace(/_/g, " "));
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: 12, background: "var(--surface)" }}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{value}</div>
      {sub ? <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}

type SP = Record<string, string | string[] | undefined>;

function buildParams(sp: SP, patch: Record<string, string | string[] | undefined>): string {
  const p = new URLSearchParams();
  const set = (k: string, v: string | string[] | undefined) => {
    if (v === undefined || v === "") return;
    if (Array.isArray(v)) v.forEach((x) => x && p.append(k, x));
    else p.set(k, v);
  };
  const keys = ["from", "to", "resStatus", "resSource", "payStatus", "payMethod", "resStatusSort", "resSourceSort", "payStatusSort", "payMethodSort"];
  for (const k of keys) {
    const v = Object.prototype.hasOwnProperty.call(patch, k) ? patch[k] : sp[k];
    set(k, v as string | string[] | undefined);
  }
  return p.toString();
}

function currentUrl(sp: SP, patch: Record<string, string | string[] | undefined> = {}) {
  const qs = buildParams(sp, patch);
  return `/management/reports${qs ? `?${qs}` : ""}`;
}

function sortHref(sp: SP, param: string, key: SortKey, current: { key: SortKey; dir: SortDir }) {
  const nextDir: SortDir = current.key === key && current.dir === "desc" ? "asc" : "desc";
  return currentUrl(sp, { [param]: `${key}_${nextDir}` });
}

function sortMark(current: { key: SortKey; dir: SortDir }, key: SortKey) {
  if (current.key !== key) return "";
  return current.dir === "asc" ? " ↑" : " ↓";
}

function exportHref(sp: SP, format: "pdf" | "xlsx") {
  const qs = buildParams(sp, {});
  const p = new URLSearchParams(qs);
  p.set("format", format);
  return `/api/management/reports/export?${p.toString()}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<SP> | SP;
}) {
  await requireDashboardRole("management");
  const sp = ((await searchParams) ?? {}) as SP;
  const params = resolveReportParams(sp);
  const data: ReportsData = await getReportsData(params);

  const hasResStatus = (v: string) => (data.filters.resStatus as readonly string[]).includes(v);
  const hasResSource = (v: string) => (data.filters.resSource as readonly string[]).includes(v);
  const hasPayStatus = (v: string) => (data.filters.payStatus as readonly string[]).includes(v);
  const hasPayMethod = (v: string) => (data.filters.payMethod as readonly string[]).includes(v);

  return (
    <ManagementShell activeNav="Reports">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">MANAGEMENT <span className="live-dot" /> REPORTS</p>
          <h1>Reports</h1>
          <p className="welcome-subtitle">Operational summary for {data.range.from} to {data.range.to}. Exports match the current filters and sorting.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <a className="room-form-submit" style={{ marginTop: 0, padding: "8px 12px", textDecoration: "none" }} href={exportHref(sp, "pdf")}>Download PDF</a>
          <a className="row-action row-action--primary" style={{ textDecoration: "none" }} href={exportHref(sp, "xlsx")}>Download Excel</a>
        </div>
      </div>

      <section className="overview-grid" style={{ gridTemplateColumns: "1fr" }}>
        <article className="panel">
          <div className="panel-heading"><div><h2>Filters</h2><p>Date range and key categories (applied to relevant report sections)</p></div></div>
          <form method="get" style={{ display: "grid", gap: 14, marginTop: 12 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
              <label style={{ fontSize: 12, color: "var(--muted)", display: "grid", gap: 4 }}>
                From <input type="date" name="from" defaultValue={data.range.from} />
              </label>
              <label style={{ fontSize: 12, color: "var(--muted)", display: "grid", gap: 4 }}>
                To <input type="date" name="to" defaultValue={data.range.to} />
              </label>
              <button type="submit" className="room-form-submit" style={{ marginTop: 0, padding: "8px 14px" }}>Apply filters</button>
              <Link href="/management/reports" className="row-action" style={{ textDecoration: "none" }}>Reset</Link>
            </div>
            {/* preserve sort params */}
            <input type="hidden" name="resStatusSort" value={`${data.sort.resStatus.key}_${data.sort.resStatus.dir}`} />
            <input type="hidden" name="resSourceSort" value={`${data.sort.resSource.key}_${data.sort.resSource.dir}`} />
            <input type="hidden" name="payStatusSort" value={`${data.sort.payStatus.key}_${data.sort.payStatus.dir}`} />
            <input type="hidden" name="payMethodSort" value={`${data.sort.payMethod.key}_${data.sort.payMethod.dir}`} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <fieldset style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}>
                <legend style={{ fontSize: 12, fontWeight: 600, padding: "0 6px" }}>Reservation status</legend>
                <div style={{ display: "grid", gap: 4 }}>
                  {REPORT_RES_STATUSES.map((s) => (
                    <label key={s} style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="checkbox" name="resStatus" value={s} defaultChecked={hasResStatus(s)} /> {titleCase(s.replace(/_/g, " "))}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}>
                <legend style={{ fontSize: 12, fontWeight: 600, padding: "0 6px" }}>Reservation source</legend>
                <div style={{ display: "grid", gap: 4 }}>
                  {REPORT_RES_SOURCES.map((s) => (
                    <label key={s} style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="checkbox" name="resSource" value={s} defaultChecked={hasResSource(s)} /> {sourceLabel(s)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}>
                <legend style={{ fontSize: 12, fontWeight: 600, padding: "0 6px" }}>Payment status</legend>
                <div style={{ display: "grid", gap: 4 }}>
                  {REPORT_PAY_STATUSES.map((s) => (
                    <label key={s} style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="checkbox" name="payStatus" value={s} defaultChecked={hasPayStatus(s)} /> {titleCase(s)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}>
                <legend style={{ fontSize: 12, fontWeight: 600, padding: "0 6px" }}>Payment method</legend>
                <div style={{ display: "grid", gap: 4 }}>
                  {REPORT_PAY_METHODS.map((s) => (
                    <label key={s} style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="checkbox" name="payMethod" value={s} defaultChecked={hasPayMethod(s)} /> {titleCase(s.replace(/_/g, " "))}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <p className="room-form-hint" style={{ margin: 0 }}>Leave a category unchecked group empty behavior: if none selected in a group, all are included for that group.</p>
          </form>
        </article>
      </section>

      <section className="overview-grid">
        <article className="panel">
          <div className="panel-heading"><div><h2>Current occupancy</h2><p>Live room status snapshot</p></div></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginTop: 12 }}>
            <Stat label="Occupancy" value={`${data.rooms.occupancyPercent}%`} sub={`${data.rooms.occupied} occupied of ${data.rooms.total}`} />
            <Stat label="Ready" value={data.rooms.ready} />
            <Stat label="Cleaning" value={data.rooms.cleaning} />
            <Stat label="Reserved" value={data.rooms.reserved} />
            <Stat label="Maintenance" value={data.rooms.maintenance} />
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading"><div><h2>Period summary</h2><p>Arrivals, departures, and revenue in range (respecting filters)</p></div></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginTop: 12 }}>
            <Stat label="Arrivals" value={data.period.arrivals} sub="Check-ins in period" />
            <Stat label="Departures" value={data.period.departures} sub="Check-outs in period" />
            <Stat label="Revenue (paid)" value={money(data.period.revenuePaid)} sub="Paid payments in period" />
          </div>
        </article>
      </section>

      <section className="overview-grid">
        <article className="panel" style={{ minWidth: 0 }}>
          <div className="panel-heading"><div><h2>Reservations</h2><p>Created in period by status and source</p></div></div>
          <div style={{ display: "grid", gap: 16, marginTop: 12 }}>
            <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>By status</h3>
              {data.period.reservationsByStatus.length === 0 ? <p className="empty-search" style={{ textAlign: "left" }}>No matching reservations in this period.</p> : (
                <div className="table-wrap"><table><thead><tr>
                  <th><Link href={sortHref(sp, "resStatusSort", "label", data.sort.resStatus)}>STATUS{sortMark(data.sort.resStatus, "label")}</Link></th>
                  <th><Link href={sortHref(sp, "resStatusSort", "count", data.sort.resStatus)}>COUNT{sortMark(data.sort.resStatus, "count")}</Link></th>
                </tr></thead><tbody>
                  {data.period.reservationsByStatus.map((r) => <tr key={r.key}><td>{titleCase(r.status)}</td><td><strong>{r.count}</strong></td></tr>)}
                </tbody></table></div>
              )}
            </div>
            <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>By source</h3>
              {data.period.reservationsBySource.length === 0 ? <p className="empty-search" style={{ textAlign: "left" }}>No matching reservations in this period.</p> : (
                <div className="table-wrap"><table><thead><tr>
                  <th><Link href={sortHref(sp, "resSourceSort", "label", data.sort.resSource)}>SOURCE{sortMark(data.sort.resSource, "label")}</Link></th>
                  <th><Link href={sortHref(sp, "resSourceSort", "count", data.sort.resSource)}>COUNT{sortMark(data.sort.resSource, "count")}</Link></th>
                </tr></thead><tbody>
                  {data.period.reservationsBySource.map((r) => <tr key={r.key}><td>{r.source}</td><td><strong>{r.count}</strong></td></tr>)}
                </tbody></table></div>
              )}
            </div>
          </div>
        </article>

        <article className="panel" style={{ minWidth: 0 }}>
          <div className="panel-heading"><div><h2>Payments</h2><p>Created in period by status and method</p></div></div>
          <div style={{ display: "grid", gap: 16, marginTop: 12 }}>
            <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>By status</h3>
              {data.period.paymentsByStatus.length === 0 ? <p className="empty-search" style={{ textAlign: "left" }}>No matching payments in this period.</p> : (
                <div className="table-wrap"><table><thead><tr>
                  <th><Link href={sortHref(sp, "payStatusSort", "label", data.sort.payStatus)}>STATUS{sortMark(data.sort.payStatus, "label")}</Link></th>
                  <th><Link href={sortHref(sp, "payStatusSort", "count", data.sort.payStatus)}>COUNT{sortMark(data.sort.payStatus, "count")}</Link></th>
                  <th><Link href={sortHref(sp, "payStatusSort", "total", data.sort.payStatus)}>TOTAL{sortMark(data.sort.payStatus, "total")}</Link></th>
                </tr></thead><tbody>
                  {data.period.paymentsByStatus.map((r) => <tr key={r.key}><td>{titleCase(r.status)}</td><td>{r.count}</td><td><strong>{money(r.total)}</strong></td></tr>)}
                </tbody></table></div>
              )}
            </div>
            <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>By method</h3>
              {data.period.paymentsByMethod.length === 0 ? <p className="empty-search" style={{ textAlign: "left" }}>No matching payments in this period.</p> : (
                <div className="table-wrap"><table><thead><tr>
                  <th><Link href={sortHref(sp, "payMethodSort", "label", data.sort.payMethod)}>METHOD{sortMark(data.sort.payMethod, "label")}</Link></th>
                  <th><Link href={sortHref(sp, "payMethodSort", "count", data.sort.payMethod)}>COUNT{sortMark(data.sort.payMethod, "count")}</Link></th>
                  <th><Link href={sortHref(sp, "payMethodSort", "total", data.sort.payMethod)}>TOTAL{sortMark(data.sort.payMethod, "total")}</Link></th>
                </tr></thead><tbody>
                  {data.period.paymentsByMethod.map((r) => <tr key={r.key}><td>{titleCase(r.method)}</td><td>{r.count}</td><td><strong>{money(r.total)}</strong></td></tr>)}
                </tbody></table></div>
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="overview-grid" style={{ gridTemplateColumns: "1fr" }}>
        <article className="panel">
          <div className="panel-heading"><div><h2>Operations snapshot</h2><p>Current workload and stock alerts</p></div></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 12 }}>
            <Stat label="Housekeeping pending" value={data.ops.housekeepingOpen} />
            <Stat label="Housekeeping in progress" value={data.ops.housekeepingInProgress} />
            <Stat label="Maintenance open" value={data.ops.maintenanceOpen} />
            <Stat label="Maintenance in progress" value={data.ops.maintenanceInProgress} />
            <Stat label="Low / reorder stock items" value={data.ops.lowStockItems} sub="Items at or below reorder level" />
          </div>
        </article>
      </section>

      <footer className="dashboard-footer">
        <span>© 2026 Bros Executive Hotel</span>
        <span>Reports · Operational summary · Branded exports available</span>
      </footer>
    </ManagementShell>
  );
}
