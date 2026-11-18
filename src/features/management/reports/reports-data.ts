import { and, count, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import {
  housekeepingTasks,
  inventoryItems,
  maintenanceWorkOrders,
  payments,
  reservations,
  rooms,
} from "@/db/schema";

export type ReportRange = { from: string; to: string };

export const REPORT_RES_STATUSES = ["reserved", "checked_in", "checked_out", "cancelled"] as const;
export const REPORT_RES_SOURCES = ["direct", "booking_com", "corporate", "walk_in", "phone"] as const;
export const REPORT_PAY_STATUSES = ["pending", "paid", "refunded"] as const;
export const REPORT_PAY_METHODS = ["cash", "card", "mobile_money", "bank_transfer"] as const;

export type ResStatus = (typeof REPORT_RES_STATUSES)[number];
export type ResSource = (typeof REPORT_RES_SOURCES)[number];
export type PayStatus = (typeof REPORT_PAY_STATUSES)[number];
export type PayMethod = (typeof REPORT_PAY_METHODS)[number];

export type ReportFilters = {
  resStatus: ResStatus[];
  resSource: ResSource[];
  payStatus: PayStatus[];
  payMethod: PayMethod[];
};

export type SortDir = "asc" | "desc";
export type SortKey = "label" | "count" | "total";

export type ReportSort = {
  resStatus: { key: SortKey; dir: SortDir };
  resSource: { key: SortKey; dir: SortDir };
  payStatus: { key: SortKey; dir: SortDir };
  payMethod: { key: SortKey; dir: SortDir };
};

export type ReportParams = {
  range: ReportRange;
  filters: ReportFilters;
  sort: ReportSort;
};

const HOTEL_TIMEZONE = "Africa/Juba";

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

function addDaysUtc(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseList<T extends string>(v: string | string[] | undefined, allowed: readonly T[]): T[] {
  if (!v) return [];
  const raw = Array.isArray(v) ? v.join(",") : v;
  const allowedSet = new Set<string>(allowed);
  return Array.from(new Set(raw.split(",").map((s) => s.trim()).filter((s): s is T => allowedSet.has(s))));
}

function parseSort(v: string | undefined, fallback: { key: SortKey; dir: SortDir }): { key: SortKey; dir: SortDir } {
  if (!v) return fallback;
  const [key, dir] = v.split("_");
  const k: SortKey = key === "total" ? "total" : key === "count" ? "count" : "label";
  const d: SortDir = dir === "asc" ? "asc" : "desc";
  return { key: k, dir: d };
}

export function resolveReportRange(fromParam?: string, toParam?: string): ReportRange {
  const today = getHotelIso(new Date());
  let to = toParam && isValidIsoDate(toParam) ? toParam : today;
  let from = fromParam && isValidIsoDate(fromParam) ? fromParam : addDaysUtc(to, -29);
  if (from > to) [from, to] = [to, from];
  return { from, to };
}

export function resolveReportParams(sp: Record<string, string | string[] | undefined>): ReportParams {
  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const range = resolveReportRange(get("from"), get("to"));
  const filters: ReportFilters = {
    resStatus: parseList(sp.resStatus, REPORT_RES_STATUSES),
    resSource: parseList(sp.resSource, REPORT_RES_SOURCES),
    payStatus: parseList(sp.payStatus, REPORT_PAY_STATUSES),
    payMethod: parseList(sp.payMethod, REPORT_PAY_METHODS),
  };
  const sort: ReportSort = {
    resStatus: parseSort(get("resStatusSort"), { key: "count", dir: "desc" }),
    resSource: parseSort(get("resSourceSort"), { key: "count", dir: "desc" }),
    payStatus: parseSort(get("payStatusSort"), { key: "total", dir: "desc" }),
    payMethod: parseSort(get("payMethodSort"), { key: "total", dir: "desc" }),
  };
  return { range, filters, sort };
}

export type ReportsData = {
  range: ReportRange;
  filters: ReportFilters;
  sort: ReportSort;
  rooms: {
    total: number;
    occupied: number;
    ready: number;
    cleaning: number;
    reserved: number;
    maintenance: number;
    occupancyPercent: number;
  };
  period: {
    arrivals: number;
    departures: number;
    revenuePaid: number;
    paymentsByStatus: { key: string; status: string; count: number; total: number }[];
    paymentsByMethod: { key: string; method: string; count: number; total: number }[];
    reservationsByStatus: { key: string; status: string; count: number }[];
    reservationsBySource: { key: string; source: string; count: number }[];
  };
  ops: {
    housekeepingOpen: number;
    housekeepingInProgress: number;
    maintenanceOpen: number;
    maintenanceInProgress: number;
    lowStockItems: number;
  };
};

function labelStatus(status: string): string {
  return status.replace(/_/g, " ");
}

function labelSource(source: string): string {
  if (source === "booking_com") return "Booking.com";
  if (source === "walk_in") return "Walk-in";
  return source.replace(/_/g, " ");
}

function sortRows<T extends { count: number; total?: number } & Record<string, unknown>>(
  rows: T[],
  labelField: string,
  key: SortKey,
  dir: SortDir,
): T[] {
  const mult = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let av: string | number;
    let bv: string | number;
    if (key === "count") {
      av = a.count; bv = b.count;
    } else if (key === "total") {
      av = a.total ?? 0; bv = b.total ?? 0;
    } else {
      av = String(a[labelField] ?? "").toLowerCase();
      bv = String(b[labelField] ?? "").toLowerCase();
    }
    if (av < bv) return -1 * mult;
    if (av > bv) return 1 * mult;
    return 0;
  });
}

export async function getReportsData(params: ReportParams): Promise<ReportsData> {
  const db = getDb();
  const { range, filters, sort } = params;
  const { from, to } = range;
  const fromTs = new Date(`${from}T00:00:00Z`);
  const toTsEnd = new Date(`${to}T23:59:59.999Z`);

  const resConds: SQL[] = [gte(reservations.createdAt, fromTs), lte(reservations.createdAt, toTsEnd)];
  if (filters.resStatus.length) resConds.push(inArray(reservations.status, [...filters.resStatus]));
  if (filters.resSource.length) resConds.push(inArray(reservations.source, [...filters.resSource]));

  const arrivalConds: SQL[] = [gte(reservations.checkIn, from), lte(reservations.checkIn, to), sql`${reservations.status} != 'cancelled'`];
  if (filters.resStatus.length) arrivalConds.push(inArray(reservations.status, [...filters.resStatus]));
  if (filters.resSource.length) arrivalConds.push(inArray(reservations.source, [...filters.resSource]));

  const departureConds: SQL[] = [gte(reservations.checkOut, from), lte(reservations.checkOut, to), sql`${reservations.status} != 'cancelled'`];
  if (filters.resStatus.length) departureConds.push(inArray(reservations.status, [...filters.resStatus]));
  if (filters.resSource.length) departureConds.push(inArray(reservations.source, [...filters.resSource]));

  const payCreatedConds: SQL[] = [gte(payments.createdAt, fromTs), lte(payments.createdAt, toTsEnd)];
  if (filters.payStatus.length) payCreatedConds.push(inArray(payments.status, [...filters.payStatus]));
  if (filters.payMethod.length) payCreatedConds.push(inArray(payments.method, [...filters.payMethod]));

  const payRevenueConds: SQL[] = [gte(payments.paidAt, fromTs), lte(payments.paidAt, toTsEnd)];
  // revenue means paid; if user filters statuses and excludes paid, revenue becomes 0
  if (filters.payStatus.length) {
    payRevenueConds.push(inArray(payments.status, [...filters.payStatus]));
  } else {
    payRevenueConds.push(eq(payments.status, "paid"));
  }
  if (filters.payMethod.length) payRevenueConds.push(inArray(payments.method, [...filters.payMethod]));

  const [
    roomRows,
    arrivalsRow,
    departuresRow,
    revenueRow,
    payStatusRows,
    payMethodRows,
    resStatusRows,
    resSourceRows,
    hkOpenRow,
    hkProgRow,
    maintOpenRow,
    maintProgRow,
    lowStockRow,
  ] = await Promise.all([
    db.select({ status: rooms.status, count: count() }).from(rooms).groupBy(rooms.status),
    db.select({ count: count() }).from(reservations).where(and(...arrivalConds)),
    db.select({ count: count() }).from(reservations).where(and(...departureConds)),
    db.select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` }).from(payments).where(and(...payRevenueConds)),
    db.select({ status: payments.status, count: count(), total: sql<string>`coalesce(sum(${payments.amount}), 0)` }).from(payments).where(and(...payCreatedConds)).groupBy(payments.status),
    db.select({ method: payments.method, count: count(), total: sql<string>`coalesce(sum(${payments.amount}), 0)` }).from(payments).where(and(...payCreatedConds)).groupBy(payments.method),
    db.select({ status: reservations.status, count: count() }).from(reservations).where(and(...resConds)).groupBy(reservations.status),
    db.select({ source: reservations.source, count: count() }).from(reservations).where(and(...resConds)).groupBy(reservations.source),
    db.select({ count: count() }).from(housekeepingTasks).where(eq(housekeepingTasks.status, "pending")),
    db.select({ count: count() }).from(housekeepingTasks).where(eq(housekeepingTasks.status, "in_progress")),
    db.select({ count: count() }).from(maintenanceWorkOrders).where(eq(maintenanceWorkOrders.status, "open")),
    db.select({ count: count() }).from(maintenanceWorkOrders).where(eq(maintenanceWorkOrders.status, "in_progress")),
    db.select({ count: count() }).from(inventoryItems).where(sql`${inventoryItems.quantity} <= ${inventoryItems.reorderLevel}`),
  ]);

  const roomsByStatus = { occupied: 0, ready: 0, cleaning: 0, reserved: 0, maintenance: 0 };
  for (const row of roomRows) {
    const key = row.status as keyof typeof roomsByStatus;
    if (key in roomsByStatus) roomsByStatus[key] = Number(row.count);
  }
  const totalRooms = Object.values(roomsByStatus).reduce((a, b) => a + b, 0);
  const occupancyPercent = totalRooms > 0 ? Math.round((roomsByStatus.occupied / totalRooms) * 1000) / 10 : 0;

  const reservationsByStatus = sortRows(
    resStatusRows.map((r) => ({ key: String(r.status), status: labelStatus(String(r.status)), count: Number(r.count) })),
    "status", sort.resStatus.key === "total" ? "count" : sort.resStatus.key, sort.resStatus.dir,
  );
  const reservationsBySource = sortRows(
    resSourceRows.map((r) => ({ key: String(r.source), source: labelSource(String(r.source)), count: Number(r.count) })),
    "source", sort.resSource.key === "total" ? "count" : sort.resSource.key, sort.resSource.dir,
  );
  const paymentsByStatus = sortRows(
    payStatusRows.map((r) => ({ key: String(r.status), status: labelStatus(String(r.status)), count: Number(r.count), total: Number(r.total) })),
    "status", sort.payStatus.key, sort.payStatus.dir,
  );
  const paymentsByMethod = sortRows(
    payMethodRows.map((r) => ({ key: String(r.method), method: labelStatus(String(r.method)), count: Number(r.count), total: Number(r.total) })),
    "method", sort.payMethod.key, sort.payMethod.dir,
  );

  return {
    range,
    filters,
    sort,
    rooms: { total: totalRooms, ...roomsByStatus, occupancyPercent },
    period: {
      arrivals: Number(arrivalsRow[0]?.count ?? 0),
      departures: Number(departuresRow[0]?.count ?? 0),
      revenuePaid: Number(revenueRow[0]?.total ?? 0),
      paymentsByStatus,
      paymentsByMethod,
      reservationsByStatus,
      reservationsBySource,
    },
    ops: {
      housekeepingOpen: Number(hkOpenRow[0]?.count ?? 0),
      housekeepingInProgress: Number(hkProgRow[0]?.count ?? 0),
      maintenanceOpen: Number(maintOpenRow[0]?.count ?? 0),
      maintenanceInProgress: Number(maintProgRow[0]?.count ?? 0),
      lowStockItems: Number(lowStockRow[0]?.count ?? 0),
    },
  };
}

