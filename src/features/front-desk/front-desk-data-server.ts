import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { guests, payments, reservations, rooms } from "@/db/schema";

const HOTEL_TIMEZONE = "Africa/Juba";

function getHotelIso(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: HOTEL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatHotelDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: HOTEL_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date).toUpperCase();
}

function formatHotelTime(date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: HOTEL_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function labelStatus(status: string): "Arriving" | "Checked in" | "Checked out" | "Cancelled" {
  switch (status) {
    case "checked_in": return "Checked in";
    case "checked_out": return "Checked out";
    case "cancelled": return "Cancelled";
    default: return "Arriving";
  }
}

function labelSource(source: string): string {
  if (source === "booking_com") return "Booking.com";
  if (source === "walk_in") return "Walk-in";
  if (source === "corporate") return "Corporate";
  if (source === "phone") return "Phone";
  return "Direct booking";
}

function formatPaymentAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type FrontDeskStay = {
  id: string;
  initials: string;
  name: string;
  booking: string;
  room: string;
  time: string;
  nights: number;
  status: "Arriving" | "Checked in" | "Checked out" | "Cancelled";
  rawStatus: "reserved" | "checked_in" | "checked_out" | "cancelled";
  paymentLabel: string;
  paymentTone: "none" | "pending" | "paid" | "partial" | "refunded";
};

export type FrontDeskRoom = {
  id: string;
  number: string;
  type: string;
  state: "Ready" | "Cleaning" | "Reserved" | "Occupied" | "Maintenance";
  rawStatus: "ready" | "cleaning" | "reserved" | "occupied" | "maintenance";
};

export type FrontDeskData = {
  todayIso: string;
  todayLabel: string;
  timeLabel: string;
  arrivals: FrontDeskStay[];
  departures: FrontDeskStay[];
  rooms: FrontDeskRoom[];
  summary: {
    arrivalsTotal: number;
    arrivalsCheckedIn: number;
    departuresTotal: number;
    departuresCheckedOut: number;
    roomsReady: number;
    roomsHousekeeping: number;
    roomsMaintenance: number;
    inHouseGuests: number;
    occupancyPercent: number;
    totalRooms: number;
  };
};

export async function getFrontDeskData(now = new Date()): Promise<FrontDeskData> {
  const db = getDb();
  const todayIso = getHotelIso(now);
  const todayLabel = formatHotelDate(now);
  const timeLabel = `${formatHotelTime(now)} EAT`;

  const [arrivalRows, departureRows, roomRows, roomCounts] = await Promise.all([
    db
      .select({
        id: reservations.id,
        reference: reservations.reference,
        guestName: guests.name,
        roomNumber: rooms.number,
        status: reservations.status,
        source: reservations.source,
        nights: reservations.nights,
      })
      .from(reservations)
      .innerJoin(guests, eq(reservations.guestId, guests.id))
      .innerJoin(rooms, eq(reservations.roomId, rooms.id))
      .where(and(eq(reservations.checkIn, todayIso), sql`${reservations.status} != 'cancelled'`))
      .orderBy(asc(reservations.checkIn)),
    db
      .select({
        id: reservations.id,
        reference: reservations.reference,
        guestName: guests.name,
        roomNumber: rooms.number,
        status: reservations.status,
        source: reservations.source,
        nights: reservations.nights,
      })
      .from(reservations)
      .innerJoin(guests, eq(reservations.guestId, guests.id))
      .innerJoin(rooms, eq(reservations.roomId, rooms.id))
      .where(and(eq(reservations.checkOut, todayIso), sql`${reservations.status} != 'cancelled'`))
      .orderBy(asc(reservations.checkOut)),
    db
      .select({ id: rooms.id, number: rooms.number, type: rooms.type, status: rooms.status })
      .from(rooms)
      .orderBy(asc(rooms.number)),
    db.select({ status: rooms.status, count: count() }).from(rooms).groupBy(rooms.status),
  ]);

  const stayReservationIds = Array.from(new Set([...arrivalRows, ...departureRows].map((r) => r.id)));
  const paymentRows =
    stayReservationIds.length === 0
      ? []
      : await db
          .select({
            reservationId: payments.reservationId,
            amount: payments.amount,
            currency: payments.currency,
            status: payments.status,
          })
          .from(payments)
          .where(inArray(payments.reservationId, stayReservationIds));

  const paymentSummaryByReservation = new Map<
    string,
    { paid: number; pending: number; refunded: number; currency: string }
  >();
  for (const p of paymentRows) {
    const entry = paymentSummaryByReservation.get(p.reservationId) ?? {
      paid: 0,
      pending: 0,
      refunded: 0,
      currency: p.currency || "USD",
    };
    const amount = Number(p.amount ?? 0);
    if (p.status === "paid") entry.paid += amount;
    else if (p.status === "pending") entry.pending += amount;
    else if (p.status === "refunded") entry.refunded += amount;
    paymentSummaryByReservation.set(p.reservationId, entry);
  }

  const toStay = (r: typeof arrivalRows[number]): FrontDeskStay => {
    const summary = paymentSummaryByReservation.get(r.id);
    let paymentTone: FrontDeskStay["paymentTone"] = "none";
    let paymentLabel = "No payment";
    if (summary) {
      const parts: string[] = [];
      if (summary.paid > 0) parts.push(`${formatPaymentAmount(summary.paid, summary.currency)} paid`);
      if (summary.pending > 0) parts.push("pending");
      if (summary.refunded > 0) parts.push("refunded");
      if (parts.length > 0) paymentLabel = parts.join(" · ");
      if (summary.pending > 0 && summary.paid > 0) paymentTone = "partial";
      else if (summary.pending > 0) paymentTone = "pending";
      else if (summary.paid > 0) paymentTone = "paid";
      else if (summary.refunded > 0) paymentTone = "refunded";
    }
    return {
      id: r.id,
      initials: initialsFromName(r.guestName),
      name: r.guestName,
      booking: `${r.reference} · ${labelSource(r.source)}`,
      room: r.roomNumber,
      time: "—",
      nights: r.nights,
      status: labelStatus(r.status),
      rawStatus: r.status as FrontDeskStay["rawStatus"],
      paymentLabel,
      paymentTone,
    };
  };

  const arrivals = arrivalRows.map(toStay);
  const departures = departureRows.map(toStay);

  const departuresTotal = departures.length;
  const departuresCheckedOut = departures.filter((d) => d.rawStatus === "checked_out").length;

  const stateMap: Record<string, FrontDeskRoom["state"]> = {
    ready: "Ready",
    cleaning: "Cleaning",
    reserved: "Reserved",
    occupied: "Occupied",
    maintenance: "Maintenance",
  };
  const roomsList: FrontDeskRoom[] = roomRows.map((r) => ({
    id: r.id,
    number: r.number,
    type: r.type,
    state: stateMap[r.status] ?? "Ready",
    rawStatus: r.status as FrontDeskRoom["rawStatus"],
  }));

  const counts = { ready: 0, cleaning: 0, reserved: 0, occupied: 0, maintenance: 0 };
  for (const row of roomCounts) {
    const k = row.status as keyof typeof counts;
    if (k in counts) counts[k] = Number(row.count);
  }
  const totalRooms = Object.values(counts).reduce((a, b) => a + b, 0);
  const occupancyPercent = totalRooms > 0 ? Math.round((counts.occupied / totalRooms) * 1000) / 10 : 0;

  return {
    todayIso,
    todayLabel,
    timeLabel,
    arrivals,
    departures,
    rooms: roomsList,
    summary: {
      arrivalsTotal: arrivals.length,
      arrivalsCheckedIn: arrivals.filter((a) => a.rawStatus === "checked_in").length,
      departuresTotal,
      departuresCheckedOut,
      roomsReady: counts.ready,
      roomsHousekeeping: counts.cleaning,
      roomsMaintenance: counts.maintenance,
      inHouseGuests: counts.occupied,
      occupancyPercent,
      totalRooms,
    },
  };
}
