import { and, count, desc, eq, gte, lt, sql, sum } from "drizzle-orm";
import { getDb } from "@/db";
import { activityLog, payments, reservations, rooms } from "@/db/schema";
import { guests } from "@/db/schema";
import type { IconName } from "@/components/ui/icon";

export type RoomStatusCounts = {
  occupied: number;
  ready: number;
  cleaning: number;
  maintenance: number;
  reserved: number;
};

export type OverviewArrival = {
  initials: string;
  name: string;
  detail: string;
  room: string;
  time: string;
  status: "Arriving" | "Checked in" | "Checked out" | "Cancelled";
};

export type OverviewActivity = {
  title: string;
  detail: string;
  time: string;
  icon: IconName;
  tone: "green" | "blue" | "amber" | "purple";
};

export type ChartRange = "Week" | "Month" | "Year";
export type ChartSet = { values: number[]; labels: string[]; totals: number[]; max: number };

export type OverviewData = {
  selectedDate: string; // YYYY-MM-DD in hotel timezone
  isToday: boolean;
  today: {
    iso: string; // selected date
    long: string; // e.g. "Tuesday, 10 November 2026"
    short: string; // e.g. "Today, Nov 10" or "Mon, Nov 9"
    time: string; // current hotel time or "—"
  };
  rooms: {
    total: number;
    counts: RoomStatusCounts;
    occupancyPercent: number; // 0-100, one decimal
  };
  arrivals: {
    total: number;
    checkedIn: number;
    expected: number;
    items: OverviewArrival[];
  };
  departures: {
    total: number;
    checkedOut: number;
    expected: number;
  };
  revenueToday: number;
  recentActivity: OverviewActivity[];
  chartSets: Record<ChartRange, ChartSet>;
};

const HOTEL_TIMEZONE = "Africa/Juba";

function formatInHotelTz(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: HOTEL_TIMEZONE, ...options }).format(date);
}

function getHotelIso(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: HOTEL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function formatSelectedDateParts(selectedIso: string, now = new Date()) {
  const nowIso = getHotelIso(now);
  const isToday = selectedIso === nowIso;
  const date = new Date(`${selectedIso}T12:00:00Z`);
  const long = formatInHotelTz(date, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const short = isToday
    ? `Today, ${formatInHotelTz(date, { month: "short", day: "numeric" })}`
    : formatInHotelTz(date, { weekday: "short", month: "short", day: "numeric" });
  const time = isToday ? formatInHotelTz(now, { hour: "numeric", minute: "2-digit", hour12: true }) : "—";
  return { iso: selectedIso, long, short, time, isToday };
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function labelReservationStatus(status: string): OverviewArrival["status"] {
  switch (status) {
    case "checked_in":
      return "Checked in";
    case "checked_out":
      return "Checked out";
    case "cancelled":
      return "Cancelled";
    default:
      return "Arriving";
  }
}

function labelSource(source: string): string {
  switch (source) {
    case "booking_com":
      return "Booking.com";
    case "corporate":
      return "Corporate";
    case "walk_in":
      return "Walk-in";
    case "phone":
      return "Phone";
    default:
      return "Direct booking";
  }
}

function relativeTime(date: Date, now = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatInHotelTz(date, { day: "numeric", month: "short" });
}

function activityPresentation(action: string): { title: string; icon: IconName; tone: OverviewActivity["tone"] } {
  switch (action) {
    case "room_created":
      return { title: "Room added", icon: "bed", tone: "blue" };
    case "reservation_created":
      return { title: "New reservation", icon: "calendar", tone: "purple" };
    case "guest_checked_in":
      return { title: "Guest checked in", icon: "check", tone: "green" };
    case "guest_checked_out":
      return { title: "Guest checked out", icon: "arrow-up", tone: "amber" };
    case "payment_received":
      return { title: "Payment received", icon: "wallet", tone: "amber" };
    default:
      return { title: action.replace(/_/g, " "), icon: "sparkles", tone: "blue" };
  }
}

function isoDateUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysUtc(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDateUtc(d);
}

function startOfMonthUtc(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

function addMonthsUtc(iso: string, months: number): string {
  const d = new Date(`${startOfMonthUtc(iso)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return startOfMonthUtc(isoDateUtc(d));
}

function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
}

function monthLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
}

function toChartSet(labels: string[], totals: number[]): ChartSet {
  const max = Math.max(0, ...totals);
  const values = totals.map((t) => (max > 0 ? Math.max(2, Math.round((t / max) * 100)) : 0));
  // keep zero bars at 0
  for (let i = 0; i < totals.length; i++) if (totals[i] === 0) values[i] = 0;
  return { labels, totals, max, values };
}

async function buildChartSets(selectedIso: string): Promise<Record<ChartRange, ChartSet>> {
  const db = getDb();

  // Week: last 7 days ending selected date
  const weekStart = addDaysUtc(selectedIso, -6);
  const weekEndExclusive = addDaysUtc(selectedIso, 1);

  // Month: last 30 days in 6 buckets (~5 days) ending selected date
  const monthStart = addDaysUtc(selectedIso, -29);
  const monthEndExclusive = addDaysUtc(selectedIso, 1);

  // Year: 12 months ending selected month
  const yearStartMonth = addMonthsUtc(selectedIso, -11);
  const yearEndMonthExclusive = addMonthsUtc(selectedIso, 1);

  const [weekRows, monthRows, yearRows] = await Promise.all([
    db.execute(sql`
      select date_trunc('day', ${payments.paidAt})::date::text as bucket, coalesce(sum(${payments.amount}), 0) as total
      from ${payments}
      where ${payments.status} = 'paid'
        and ${payments.paidAt} >= ${`${weekStart}T00:00:00Z`}::timestamptz
        and ${payments.paidAt} < ${`${weekEndExclusive}T00:00:00Z`}::timestamptz
      group by 1
    `),
    db.execute(sql`
      select date_trunc('day', ${payments.paidAt})::date::text as bucket, coalesce(sum(${payments.amount}), 0) as total
      from ${payments}
      where ${payments.status} = 'paid'
        and ${payments.paidAt} >= ${`${monthStart}T00:00:00Z`}::timestamptz
        and ${payments.paidAt} < ${`${monthEndExclusive}T00:00:00Z`}::timestamptz
      group by 1
    `),
    db.execute(sql`
      select date_trunc('month', ${payments.paidAt})::date::text as bucket, coalesce(sum(${payments.amount}), 0) as total
      from ${payments}
      where ${payments.status} = 'paid'
        and ${payments.paidAt} >= ${`${yearStartMonth}T00:00:00Z`}::timestamptz
        and ${payments.paidAt} < ${`${yearEndMonthExclusive}T00:00:00Z`}::timestamptz
      group by 1
    `),
  ]);

  const weekMap = new Map<string, number>();
  for (const row of (weekRows as unknown as { bucket: string; total: string }[])) weekMap.set(String(row.bucket), Number(row.total));
  const weekLabels: string[] = [];
  const weekTotals: number[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDaysUtc(weekStart, i);
    weekLabels.push(dayLabel(d));
    weekTotals.push(weekMap.get(d) ?? 0);
  }

  const dayTotalsMap = new Map<string, number>();
  for (const row of (monthRows as unknown as { bucket: string; total: string }[])) dayTotalsMap.set(String(row.bucket), Number(row.total));
  const monthLabels: string[] = [];
  const monthTotals: number[] = [];
  // 6 buckets of 5 days covering 30 days
  for (let b = 0; b < 6; b++) {
    const start = addDaysUtc(monthStart, b * 5);
    let total = 0;
    for (let i = 0; i < 5; i++) total += dayTotalsMap.get(addDaysUtc(start, i)) ?? 0;
    monthLabels.push(String(new Date(`${start}T12:00:00Z`).getUTCDate()));
    monthTotals.push(total);
  }

  const yearMap = new Map<string, number>();
  for (const row of (yearRows as unknown as { bucket: string; total: string }[])) {
    const key = String(row.bucket).slice(0, 7) + "-01";
    yearMap.set(key, Number(row.total));
  }
  const yearLabels: string[] = [];
  const yearTotals: number[] = [];
  for (let i = 0; i < 12; i++) {
    const m = addMonthsUtc(yearStartMonth, i);
    yearLabels.push(monthLabel(m));
    yearTotals.push(yearMap.get(m) ?? 0);
  }

  return {
    Week: toChartSet(weekLabels, weekTotals),
    Month: toChartSet(monthLabels, monthTotals),
    Year: toChartSet(yearLabels, yearTotals),
  };
}

export async function getOverviewData(selectedDate?: string, now = new Date()): Promise<OverviewData> {
  const db = getDb();
  const nowIso = getHotelIso(now);
  const selectedIso = selectedDate && isValidIsoDate(selectedDate) ? selectedDate : nowIso;
  const { isToday, ...today } = formatSelectedDateParts(selectedIso, now);

  // Use UTC day bounds for paidAt comparisons (timestamptz). Selected date is hotel-local date.
  const dayStart = new Date(`${selectedIso}T00:00:00Z`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const [roomRows, arrivalRows, departureRows, revenueRows, activityRows, chartSets] = await Promise.all([
    db.select({ status: rooms.status, count: count() }).from(rooms).groupBy(rooms.status),
    db
      .select({
        guestName: guests.name,
        roomNumber: rooms.number,
        status: reservations.status,
        source: reservations.source,
        nights: reservations.nights,
      })
      .from(reservations)
      .innerJoin(guests, eq(reservations.guestId, guests.id))
      .innerJoin(rooms, eq(reservations.roomId, rooms.id))
      .where(and(eq(reservations.checkIn, selectedIso), sql`${reservations.status} != 'cancelled'`))
      .orderBy(reservations.checkIn),
    db
      .select({ status: reservations.status })
      .from(reservations)
      .where(and(eq(reservations.checkOut, selectedIso), sql`${reservations.status} != 'cancelled'`)),
    db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(
        and(
          eq(payments.status, "paid"),
          gte(payments.paidAt, dayStart),
          lt(payments.paidAt, dayEnd),
        ),
      ),
    db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(8),
    buildChartSets(selectedIso),
  ]);

  const counts: RoomStatusCounts = { occupied: 0, ready: 0, cleaning: 0, maintenance: 0, reserved: 0 };
  for (const row of roomRows) {
    const key = row.status as keyof RoomStatusCounts;
    if (key in counts) counts[key] = Number(row.count);
  }
  const totalRooms = counts.occupied + counts.ready + counts.cleaning + counts.maintenance + counts.reserved;
  const occupancyPercent = totalRooms > 0 ? Math.round((counts.occupied / totalRooms) * 1000) / 10 : 0;

  const arrivalItems: OverviewArrival[] = arrivalRows.map((row) => ({
    initials: initialsFromName(row.guestName),
    name: row.guestName,
    detail: `${labelSource(row.source)} · ${row.nights} ${row.nights === 1 ? "night" : "nights"}`,
    room: row.roomNumber,
    time: "—",
    status: labelReservationStatus(row.status),
  }));
  const arrivalsCheckedIn = arrivalItems.filter((a) => a.status === "Checked in").length;

  const departuresTotal = departureRows.length;
  const departuresCheckedOut = departureRows.filter((d) => d.status === "checked_out").length;

  const revenueToday = revenueRows[0]?.total ? Number(revenueRows[0].total) : 0;

  const recentActivity: OverviewActivity[] = activityRows.map((row) => {
    const p = activityPresentation(row.action);
    return {
      title: p.title,
      detail: row.detail || row.actorName || "—",
      time: row.createdAt ? relativeTime(row.createdAt, now) : "",
      icon: p.icon,
      tone: p.tone,
    };
  });

  return {
    selectedDate: selectedIso,
    isToday,
    today,
    rooms: { total: totalRooms, counts, occupancyPercent },
    arrivals: {
      total: arrivalItems.length,
      checkedIn: arrivalsCheckedIn,
      expected: arrivalItems.length - arrivalsCheckedIn,
      items: arrivalItems,
    },
    departures: {
      total: departuresTotal,
      checkedOut: departuresCheckedOut,
      expected: departuresTotal - departuresCheckedOut,
    },
    revenueToday,
    recentActivity,
    chartSets,
  };
}

export async function getRecentActivity(limit = 50): Promise<OverviewActivity[]> {
  const db = getDb();
  const now = new Date();
  const rows = await db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(limit);
  return rows.map((row) => {
    const p = activityPresentation(row.action);
    return {
      title: p.title,
      detail: row.detail || row.actorName || "—",
      time: row.createdAt ? relativeTime(row.createdAt, now) : "",
      icon: p.icon,
      tone: p.tone,
    };
  });
}
