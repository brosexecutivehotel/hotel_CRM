"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activityLog, guests, payments, reservations, rooms } from "@/db/schema";
import { requireDashboardRole } from "@/lib/auth/roles";

export type PaymentFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export type PaymentActionState = {
  ok: boolean;
  message?: string;
};

const PAYMENT_METHODS = ["cash", "card", "mobile_money", "bank_transfer"] as const;
const PAYMENT_STATUSES = ["pending", "paid", "refunded"] as const;

const createSchema = z.object({
  reservationId: z.string().uuid("Select a reservation"),
  amount: z.coerce.number().positive("Amount must be greater than 0").max(99999999.99, "Amount is too large"),
  currency: z.string().trim().length(3, "Use a 3-letter currency code").transform((v) => v.toUpperCase()),
  method: z.enum(PAYMENT_METHODS),
  status: z.enum(PAYMENT_STATUSES),
});

function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
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

function revalidatePaymentViews() {
  revalidatePath("/management/payments");
  revalidatePath("/management");
  revalidatePath("/management/reservations");
  revalidatePath("/front-desk");
}

function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function createPayment(_prev: PaymentFormState, formData: FormData): Promise<PaymentFormState> {
  await requireDashboardRole(["management", "front_desk"]);

  const parsed = createSchema.safeParse({
    reservationId: formData.get("reservationId") ?? "",
    amount: formData.get("amount") ?? "",
    currency: formData.get("currency") || "USD",
    method: formData.get("method") || "cash",
    status: formData.get("status") || "pending",
  });

  if (!parsed.success) {
    return { ok: false, errors: fieldErrorsFrom(parsed.error) };
  }

  const db = getDb();
  const [resRow] = await db
    .select({
      id: reservations.id,
      reference: reservations.reference,
      guestName: guests.name,
      roomNumber: rooms.number,
    })
    .from(reservations)
    .innerJoin(guests, eq(reservations.guestId, guests.id))
    .innerJoin(rooms, eq(reservations.roomId, rooms.id))
    .where(eq(reservations.id, parsed.data.reservationId))
    .limit(1);

  if (!resRow) return { ok: false, errors: { reservationId: ["Selected reservation was not found."] } };

  const paidAt = parsed.data.status === "paid" ? new Date() : null;
  await db.insert(payments).values({
    reservationId: parsed.data.reservationId,
    amount: parsed.data.amount.toFixed(2),
    currency: parsed.data.currency,
    method: parsed.data.method,
    status: parsed.data.status,
    paidAt,
  });

  const actor = await getActor();
  await db.insert(activityLog).values({
    actorId: actor.id,
    actorName: actor.name,
    action: parsed.data.status === "paid" ? "payment_received" : "payment_created",
    detail: `${formatMoney(parsed.data.amount, parsed.data.currency)} · ${resRow.reference} · ${resRow.guestName} (Room ${resRow.roomNumber})`,
  });

  revalidatePaymentViews();
  return { ok: true, message: `Payment recorded for ${resRow.reference}.` };
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(PAYMENT_STATUSES),
});

export async function updatePaymentStatus(_prev: PaymentActionState, formData: FormData): Promise<PaymentActionState> {
  await requireDashboardRole(["management", "front_desk"]);
  const parsed = statusSchema.safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) return { ok: false, message: "Invalid payment update." };

  const db = getDb();
  const [row] = await db
    .select({
      id: payments.id,
      status: payments.status,
      amount: payments.amount,
      currency: payments.currency,
      paidAt: payments.paidAt,
      reference: reservations.reference,
      guestName: guests.name,
      roomNumber: rooms.number,
    })
    .from(payments)
    .innerJoin(reservations, eq(payments.reservationId, reservations.id))
    .innerJoin(guests, eq(reservations.guestId, guests.id))
    .innerJoin(rooms, eq(reservations.roomId, rooms.id))
    .where(eq(payments.id, parsed.data.id))
    .limit(1);

  if (!row) return { ok: false, message: "Payment not found." };
  if (row.status === parsed.data.status) return { ok: true, message: "No changes." };

  const nextPaidAt = parsed.data.status === "paid" ? row.paidAt ?? new Date() : parsed.data.status === "pending" ? null : row.paidAt;
  await db
    .update(payments)
    .set({ status: parsed.data.status, paidAt: nextPaidAt })
    .where(eq(payments.id, row.id));

  const actor = await getActor();
  const action = parsed.data.status === "paid" ? "payment_received" : "payment_updated";
  await db.insert(activityLog).values({
    actorId: actor.id,
    actorName: actor.name,
    action,
    detail: `${row.currency} ${Number(row.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · ${row.reference} · ${row.guestName} → ${parsed.data.status}`,
  });

  revalidatePaymentViews();
  return { ok: true, message: "Payment updated." };
}
