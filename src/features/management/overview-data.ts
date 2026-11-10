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
export type ChartSet = { values: number[]; labels: string[] };

export type OverviewData = {
  today: {
    iso: string; // YYYY-MM-DD in hotel timezone
    long: string; // e.g. "Tuesday, 10 November 2026"
    short: string; // e.g. "Today, Nov 10"
    time: string; // e.g. "10:42 AM"
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

function getHotelTodayParts(now = new Date()) {
  // en-CA gives YYYY-MM-DD
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: HOTEL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const long = formatInHotelTz(now, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const short = `Today, ${formatInHotelTz(now, { month: "short", day: "numeric" })}`;
  const time = formatInHotelTz(now, { hour: "numeric", minute: "2-digit", hour12: true });

  return { iso, long, short, time };
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

function buildEmptyChartSets(): Record<ChartRange, ChartSet> {
  return {
    Week: { values: [0, 0, 0, 0, 0, 0, 0], labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
    Month: { values: [0, 0, 0, 0, 0, 0, 0], labels: ["1", "5", "10", "15", "20", "25", "30"] },
    Year: { values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] },
  };
}

export async function getOverviewData(now = new Date()): Promise<OverviewData> {
  const db = getDb();
  const today = getHotelTodayParts(now);
  const todayStart = new Date(`${today.iso}T00:00:00.000Z`); // payments stored as timestamptz; approximate
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const [roomRows, arrivalRows, departureRows, revenueRows, activityRows] = await Promise.all([
    db.select({ status: rooms.status, count: count() }).from(rooms).groupBy(rooms.status),
    db
      .select({
        guestName: guests.name,
        guestSegment: guests.segment,
        roomNumber: rooms.number,
        status: reservations.status,
        source: reservations.source,
        nights: reservations.nights,
        checkIn: reservations.checkIn,
      })
      .from(reservations)
      .innerJoin(guests, eq(reservations.guestId, guests.id))
      .innerJoin(rooms, eq(reservations.roomId, rooms.id))
      .where(and(eq(reservations.checkIn, today.iso), sql`${reservations.status} != 'cancelled'`))
      .orderBy(reservations.checkIn),
    db
      .select({ status: reservations.status })
      .from(reservations)
      .where(and(eq(reservations.checkOut, today.iso), sql`${reservations.status} != 'cancelled'`)),
    db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(
        and(
          eq(payments.status, "paid"),
          gte(payments.paidAt, todayStart),
          lt(payments.paidAt, tomorrowStart),
        ),
      ),
    db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(8),
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
    time: "—", // check-in time not tracked yet
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
    chartSets: buildEmptyChartSets(),
  };
}
