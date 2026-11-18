"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import {
  activityLog,
  fbMenuCategories,
  fbMenuItems,
  fbOrderItems,
  fbOrders,
  reservations,
} from "@/db/schema";
import { requireDashboardRole } from "@/lib/auth/roles";

export type ActionState = { ok: boolean; message?: string; errors?: Record<string, string[]> };
export type SimpleState = { ok: boolean; message?: string };

const ORDER_STATUSES = ["open", "served", "paid", "cancelled"] as const;

async function getActor() {
  const user = await currentUser();
  const actorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "Staff";
  return { id: user?.id ?? null, name: actorName.slice(0, 120) };
}

function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

function revalidateFb() {
  revalidatePath("/management/restaurant-bar");
  revalidatePath("/management");
}

async function genOrderRef() {
  const db = getDb();
  for (let i = 0; i < 5; i++) {
    const ref = `FB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const exists = await db.select({ id: fbOrders.id }).from(fbOrders).where(eq(fbOrders.reference, ref)).limit(1);
    if (!exists.length) return ref;
  }
  return `FB-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

const categorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required").max(80),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});

export async function createMenuCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireDashboardRole("management");
  const parsed = categorySchema.safeParse({
    name: formData.get("name") ?? "",
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const db = getDb();
  await db.insert(fbMenuCategories).values({
    name: parsed.data.name,
    sortOrder: parsed.data.sortOrder ?? 0,
    active: 1,
  });
  revalidateFb();
  return { ok: true, message: `Category "${parsed.data.name}" added.` };
}

const menuItemSchema = z.object({
  categoryId: z.string().uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  name: z.string().trim().min(2, "Item name is required").max(120),
  price: z.coerce.number().min(0, "Price cannot be negative").max(99999999.99),
});

export async function createMenuItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireDashboardRole("management");
  const parsed = menuItemSchema.safeParse({
    categoryId: formData.get("categoryId") ?? "",
    name: formData.get("name") ?? "",
    price: formData.get("price") ?? "",
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const db = getDb();
  await db.insert(fbMenuItems).values({
    categoryId: (parsed.data.categoryId as string | undefined) ?? null,
    name: parsed.data.name,
    price: parsed.data.price.toFixed(2),
    active: 1,
  });
  revalidateFb();
  return { ok: true, message: `Menu item "${parsed.data.name}" added.` };
}

const toggleMenuSchema = z.object({ id: z.string().uuid(), active: z.enum(["0", "1"]) });
export async function toggleMenuItemActive(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  await requireDashboardRole("management");
  const parsed = toggleMenuSchema.safeParse({ id: formData.get("id"), active: formData.get("active") });
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const db = getDb();
  await db.update(fbMenuItems).set({ active: Number(parsed.data.active), updatedAt: new Date() }).where(eq(fbMenuItems.id, parsed.data.id));
  revalidateFb();
  return { ok: true };
}

const orderSchema = z.object({
  tableLabel: z.string().trim().max(40).optional().transform((v) => (v ? v : undefined)),
  reservationId: z.string().uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  guestName: z.string().trim().max(120).optional().transform((v) => (v ? v : undefined)),
  notes: z.string().trim().max(500).optional().transform((v) => (v ? v : undefined)),
});

export async function createOrder(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireDashboardRole("management");
  const parsed = orderSchema.safeParse({
    tableLabel: formData.get("tableLabel") ?? "",
    reservationId: formData.get("reservationId") ?? "",
    guestName: formData.get("guestName") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const db = getDb();

  let roomId: string | null = null;
  if (parsed.data.reservationId) {
    const [res] = await db.select({ id: reservations.id, roomId: reservations.roomId }).from(reservations).where(eq(reservations.id, parsed.data.reservationId)).limit(1);
    if (!res) return { ok: false, errors: { reservationId: ["Reservation not found."] } };
    roomId = res.roomId;
  }

  const ref = await genOrderRef();
  const actor = await getActor();
  await db.insert(fbOrders).values({
    reference: ref,
    status: "open",
    tableLabel: parsed.data.tableLabel ?? null,
    reservationId: (parsed.data.reservationId as string | undefined) ?? null,
    roomId,
    guestName: parsed.data.guestName ?? null,
    notes: parsed.data.notes ?? null,
    createdBy: actor.id,
  });
  await db.insert(activityLog).values({
    actorId: actor.id,
    actorName: actor.name,
    action: "fb_order_created",
    detail: `${ref}${parsed.data.tableLabel ? ` · ${parsed.data.tableLabel}` : ""}${parsed.data.guestName ? ` · ${parsed.data.guestName}` : ""}`,
  });
  revalidateFb();
  return { ok: true, message: `Order ${ref} created.` };
}

const addItemSchema = z.object({
  orderId: z.string().uuid(),
  menuItemId: z.string().uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  description: z.string().trim().max(160).optional().transform((v) => (v ? v : undefined)),
  quantity: z.coerce.number().int().min(1).max(999),
  unitPrice: z.coerce.number().min(0).max(99999999.99).optional(),
});

export async function addOrderItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireDashboardRole("management");
  const parsed = addItemSchema.safeParse({
    orderId: formData.get("orderId") ?? "",
    menuItemId: formData.get("menuItemId") ?? "",
    description: formData.get("description") ?? "",
    quantity: formData.get("quantity") ?? 1,
    unitPrice: formData.get("unitPrice") || undefined,
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const db = getDb();

  const [order] = await db.select({ id: fbOrders.id, status: fbOrders.status, reference: fbOrders.reference }).from(fbOrders).where(eq(fbOrders.id, parsed.data.orderId)).limit(1);
  if (!order) return { ok: false, message: "Order not found." };
  if (order.status === "paid" || order.status === "cancelled") return { ok: false, message: "Cannot add items to a paid or cancelled order." };

  let description = parsed.data.description;
  let unitPrice = parsed.data.unitPrice;

  if (parsed.data.menuItemId) {
    const [mi] = await db.select({ name: fbMenuItems.name, price: fbMenuItems.price, active: fbMenuItems.active }).from(fbMenuItems).where(eq(fbMenuItems.id, parsed.data.menuItemId)).limit(1);
    if (!mi) return { ok: false, message: "Menu item not found." };
    description = description || mi.name;
    if (unitPrice === undefined) unitPrice = Number(mi.price);
  }

  if (!description) return { ok: false, errors: { description: ["Enter a description or select a menu item."] } };
  if (unitPrice === undefined || Number.isNaN(unitPrice)) return { ok: false, errors: { unitPrice: ["Enter a unit price."] } };

  const qty = parsed.data.quantity;
  const lineTotal = qty * unitPrice;

  await db.insert(fbOrderItems).values({
    orderId: parsed.data.orderId,
    menuItemId: (parsed.data.menuItemId as string | undefined) ?? null,
    description,
    quantity: qty,
    unitPrice: unitPrice.toFixed(2),
    lineTotal: lineTotal.toFixed(2),
  });
  await db.update(fbOrders).set({ updatedAt: new Date() }).where(eq(fbOrders.id, parsed.data.orderId));

  revalidateFb();
  return { ok: true, message: `Item added to ${order.reference}.` };
}

const orderStatusSchema = z.object({ id: z.string().uuid(), status: z.enum(ORDER_STATUSES) });
export async function updateOrderStatus(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  await requireDashboardRole("management");
  const parsed = orderStatusSchema.safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) return { ok: false, message: "Invalid status update." };
  const db = getDb();
  const [order] = await db.select({ id: fbOrders.id, reference: fbOrders.reference, status: fbOrders.status }).from(fbOrders).where(eq(fbOrders.id, parsed.data.id)).limit(1);
  if (!order) return { ok: false, message: "Order not found." };
  if (order.status === parsed.data.status) return { ok: true };
  await db.update(fbOrders).set({ status: parsed.data.status, updatedAt: new Date() }).where(eq(fbOrders.id, parsed.data.id));
  const actor = await getActor();
  await db.insert(activityLog).values({
    actorId: actor.id,
    actorName: actor.name,
    action: parsed.data.status === "paid" ? "fb_order_paid" : "fb_order_updated",
    detail: `${order.reference} → ${parsed.data.status}`,
  });
  revalidateFb();
  return { ok: true, message: `Order ${order.reference} updated.` };
}