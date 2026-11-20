import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { guests, payments, reservations } from "@/db/schema";

export type GuestSegment = "vip" | "returning" | "corporate" | "new";

export type CrmGuestProfile = {
  id: string;
  initials: string;
  name: string;
  email: string;
  country: string;
  visits: number;
  lastStay: string;
  lifetimeValue: string;
  segment: GuestSegment;
  notes: string | null;
};

export type CrmData = {
  metrics: {
    totalGuests: number;
    repeatGuests: number;
    repeatRate: number;
    vipGuests: number;
    countries: number;
    newGuests: number;
    totalLifetimeValue: string;
  };
  segmentCounts: { vip: number; returning: number; corporate: number; new: number };
  directory: CrmGuestProfile[];
  recentNotes: { id: string; name: string; segment: GuestSegment; notes: string; updatedAt: string }[];
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function titleSegment(segment: string): GuestSegment {
  if (segment === "vip" || segment === "returning" || segment === "corporate" || segment === "new") return segment;
  return "new";
}

function segmentLabel(segment: GuestSegment): "VIP" | "Returning" | "Corporate" | "New" {
  if (segment === "vip") return "VIP";
  if (segment === "returning") return "Returning";
  if (segment === "corporate") return "Corporate";
  return "New";
}

export function displaySegment(segment: GuestSegment): "VIP" | "Returning" | "Corporate" | "New" {
  return segmentLabel(segment);
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function formatDateLabel(value: string | Date | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(d);
}

export async function getCrmData(): Promise<CrmData> {
  const db = getDb();

  const rows = await db
    .select({
      id: guests.id,
      name: guests.name,
      email: guests.email,
      country: guests.country,
      segment: guests.segment,
      notes: guests.notes,
      updatedAt: guests.updatedAt,
      visits: sql<number>`count(distinct case when ${reservations.status} != 'cancelled' then ${reservations.id} end)::int`,
      lastStay: sql<string | null>`max(${reservations.checkOut})`,
      lifetimeValue: sql<string>`coalesce(sum(case when ${payments.status} = 'paid' then ${payments.amount} else 0 end), 0)`,
    })
    .from(guests)
    .leftJoin(reservations, eq(reservations.guestId, guests.id))
    .leftJoin(payments, eq(payments.reservationId, reservations.id))
    .groupBy(guests.id, guests.name, guests.email, guests.country, guests.segment, guests.notes, guests.updatedAt)
    .orderBy(desc(sql`max(${reservations.checkOut})`), desc(guests.updatedAt), desc(guests.createdAt));

  let totalLifetime = 0;
  let repeatGuests = 0;
  let vipGuests = 0;
  let newGuests = 0;
  const countries = new Set<string>();
  const segmentCounts = { vip: 0, returning: 0, corporate: 0, new: 0 };

  const directory: CrmGuestProfile[] = rows.map((r) => {
    const seg = titleSegment(r.segment as string);
    const visits = Number(r.visits ?? 0);
    const lifetime = Number(r.lifetimeValue ?? 0);
    totalLifetime += lifetime;
    if (visits >= 2 || seg === "returning") repeatGuests += 1;
    if (seg === "vip") vipGuests += 1;
    if (seg === "new") newGuests += 1;
    if (r.country) countries.add(r.country.trim());
    segmentCounts[seg] += 1;

    return {
      id: r.id,
      initials: initialsFromName(r.name),
      name: r.name,
      email: r.email ?? "—",
      country: r.country ?? "—",
      visits,
      lastStay: formatDateLabel(r.lastStay),
      lifetimeValue: formatMoney(lifetime),
      segment: seg,
      notes: r.notes ?? null,
    };
  });

  const totalGuests = directory.length;
  const repeatRate = totalGuests > 0 ? Math.round((repeatGuests / totalGuests) * 1000) / 10 : 0;

  const recentNotes = rows
    .filter((r) => (r.notes ?? "").trim().length > 0)
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      name: r.name,
      segment: titleSegment(r.segment as string),
      notes: (r.notes ?? "").trim(),
      updatedAt: formatDateLabel(r.updatedAt),
    }));

  return {
    metrics: {
      totalGuests,
      repeatGuests,
      repeatRate,
      vipGuests,
      countries: countries.size,
      newGuests,
      totalLifetimeValue: formatMoney(totalLifetime),
    },
    segmentCounts,
    directory,
    recentNotes,
  };
}
