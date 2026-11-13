"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activityLog, guests, reservations, rooms } from "@/db/schema";
import { requireDashboardRole } from "@/lib/auth/roles";

export type ReservationFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export type ReservationActionState = {
  ok: boolean;
  message?: string;
};

const RESERVATION_STATUSES = ["reserved", "checked_in", "checked_out", "cancelled"] as const;
const RESERVATION_SOURCES = ["direct", "booking_com", "corporate", "walk_in", "phone"] as const;
const GUEST_SEGMENTS = ["vip", "returning", "corporate", "new"] as const;

const schema = z
  .object({
    guestName: z.string().trim().min(2, "Guest name is required").max(120),
    guestEmail: z
      .string()
      .trim()
      .max(255)
      .optional()
      .transform((v) => (v ? v : undefined))
      .pipe(z.string().email("Enter a valid email address").optional()),
    guestPhone: z.string().trim().max(30).optional().transform((v) => (v ? v : undefined)),
    guestCountry: z.string().trim().max(80).optional().transform((v) => (v ? v : undefined)),
    guestSegment: z.enum(GUEST_SEGMENTS),
    roomId: z.string().uuid("Select a room"),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Check-in date is required"),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Check-out date is required"),
    status: z.enum(RESERVATION_STATUSES),
    source: z.enum(RESERVATION_SOURCES),
  })
  .refine((d) => d.checkOut > d.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(`${checkIn}T00:00:00Z`).getTime();
  const b = new Date(`${checkOut}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((b - a) / 86400000));
}

async function generateReference(): Promise<string> {
  const db = getDb();
  for (let i = 0; i < 5; i++) {
    const ref = `RES-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const existing = await db.select({ id: reservations.id }).from(reservations).where(eq(reservations.reference, ref)).limit(1);
    if (existing.length === 0) return ref;
  }
  return `RES-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

async function getActor() {
  const user = await currentUser();
  const actorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "Staff";
  return { id: user?.id ?? null, name: actorName.slice(0, 120) };
}

function revalidateReservationViews() {
  revalidatePath("/management/reservations");
  revalidatePath("/management");
  revalidatePath("/management/rooms");
}

export async function createReservation(_prev: ReservationFormState, formData: FormData): Promise<ReservationFormState> {
  await requireDashboardRole("management");

  const parsed = schema.safeParse({
    guestName: formData.get("guestName") ?? "",
    guestEmail: formData.get("guestEmail") ?? "",
    guestPhone: formData.get("guestPhone") ?? "",
    guestCountry: formData.get("guestCountry") ?? "",
    guestSegment: formData.get("guestSegment") || "new",
    roomId: formData.get("roomId") ?? "",
    checkIn: formData.get("checkIn") ?? "",
    checkOut: formData.get("checkOut") ?? "",
    status: formData.get("status") || "reserved",
    source: formData.get("source") || "direct",
  });

  if (!parsed.success) {
    return { ok: false, errors: fieldErrorsFrom(parsed.error) };
  }

  const data = parsed.data;
  const db = getDb();

  const room = await db.select({ id: rooms.id, number: rooms.number }).from(rooms).where(eq(rooms.id, data.roomId)).limit(1);
  if (room.length === 0) {
    return { ok: false, errors: { roomId: ["Selected room was not found."] } };
  }

  // Basic overlap check for active reservations on the same room
  if (data.status !== "cancelled" && data.status !== "checked_out") {
    const overlap = await db
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.roomId, data.roomId),
          ne(reservations.status, "cancelled"),
          ne(reservations.status, "checked_out"),
          lt(reservations.checkIn, data.checkOut),
          gt(reservations.checkOut, data.checkIn),
        ),
      )
      .limit(1);
    if (overlap.length > 0) {
      return { ok: false, errors: { roomId: ["This room already has a reservation overlapping these dates."] } };
    }
  }

  const actor = await getActor();
  const [guest] = await db
    .insert(guests)
    .values({
      name: data.guestName,
      email: data.guestEmail ?? null,
      phone: data.guestPhone ?? null,
      country: data.guestCountry ?? null,
      segment: data.guestSegment,
    })
    .returning({ id: guests.id, name: guests.name });

  const reference = await generateReference();
  const nights = nightsBetween(data.checkIn, data.checkOut);

  await db.insert(reservations).values({
    reference,
    guestId: guest!.id,
    roomId: data.roomId,
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    nights,
    status: data.status,
    source: data.source,
    createdBy: actor.id,
  });

  // Keep room status roughly in sync for immediate operational states
  if (data.status === "checked_in") {
    await db.update(rooms).set({ status: "occupied", updatedAt: new Date() }).where(eq(rooms.id, data.roomId));
  } else if (data.status === "reserved") {
    await db.update(rooms).set({ status: "reserved", updatedAt: new Date() }).where(eq(rooms.id, data.roomId));
  }

  await db.insert(activityLog).values({
    actorId: actor.id,
    actorName: actor.name,
    action: "reservation_created",
    detail: `${guest!.name} · Room ${room[0]!.number} · ${data.checkIn} to ${data.checkOut} (${reference})`,
  });

  revalidateReservationViews();
  return { ok: true, message: `Reservation ${reference} created for ${guest!.name}.` };
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(RESERVATION_STATUSES),
});

export async function updateReservationStatus(_prev: ReservationActionState, formData: FormData): Promise<ReservationActionState> {
  await requireDashboardRole("management");
  const parsed = statusSchema.safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) return { ok: false, message: "Invalid reservation update." };

  const db = getDb();
  const [row] = await db
    .select({
      id: reservations.id,
      reference: reservations.reference,
      roomId: reservations.roomId,
      status: reservations.status,
      guestName: guests.name,
      roomNumber: rooms.number,
      checkIn: reservations.checkIn,
      checkOut: reservations.checkOut,
    })
    .from(reservations)
    .innerJoin(guests, eq(reservations.guestId, guests.id))
    .innerJoin(rooms, eq(reservations.roomId, rooms.id))
    .where(eq(reservations.id, parsed.data.id))
    .limit(1);

  if (!row) return { ok: false, message: "Reservation not found." };
  if (row.status === parsed.data.status) return { ok: true, message: "No changes." };

  // prevent overlapping active stays when activating
  if (parsed.data.status === "reserved" || parsed.data.status === "checked_in") {
    const overlap = await db
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.roomId, row.roomId),
          ne(reservations.id, row.id),
          ne(reservations.status, "cancelled"),
          ne(reservations.status, "checked_out"),
          lt(reservations.checkIn, row.checkOut),
          gt(reservations.checkOut, row.checkIn),
        ),
      )
      .limit(1);
    if (overlap.length > 0) return { ok: false, message: "Cannot activate: room has an overlapping active reservation." };
  }

  await db
    .update(reservations)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(reservations.id, row.id));

  if (parsed.data.status === "checked_in") {
    await db.update(rooms).set({ status: "occupied", updatedAt: new Date() }).where(eq(rooms.id, row.roomId));
  } else if (parsed.data.status === "checked_out") {
    await db.update(rooms).set({ status: "cleaning", updatedAt: new Date() }).where(eq(rooms.id, row.roomId));
  } else if (parsed.data.status === "reserved") {
    await db.update(rooms).set({ status: "reserved", updatedAt: new Date() }).where(eq(rooms.id, row.roomId));
  }

  const actor = await getActor();
  const action =
    parsed.data.status === "checked_in"
      ? "guest_checked_in"
      : parsed.data.status === "checked_out"
        ? "guest_checked_out"
        : parsed.data.status === "cancelled"
          ? "reservation_cancelled"
          : "reservation_updated";

  await db.insert(activityLog).values({
    actorId: actor.id,
    actorName: actor.name,
    action,
    detail: `${row.guestName} · Room ${row.roomNumber} · ${row.reference} → ${parsed.data.status.replace("_", " ")}`,
  });

  revalidateReservationViews();
  return { ok: true, message: `Reservation ${row.reference} updated.` };
}
