"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activityLog, inventoryItems, inventoryMovements } from "@/db/schema";
import { requireDashboardRole } from "@/lib/auth/roles";

export type ActionState = { ok: boolean; message?: string; errors?: Record<string, string[]> };

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

function revalidateInventory() {
  revalidatePath("/management/inventory");
  revalidatePath("/management");
}

const createItemSchema = z.object({
  name: z.string().trim().min(2, "Item name is required").max(120),
  category: z.string().trim().max(80).optional().transform((v) => (v ? v : undefined)),
  unit: z.string().trim().min(1, "Unit is required").max(30).default("pcs"),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative").max(1_000_000).default(0),
  reorderLevel: z.coerce.number().int().min(0).max(1_000_000).default(0),
  location: z.string().trim().max(80).optional().transform((v) => (v ? v : undefined)),
  notes: z.string().trim().max(500).optional().transform((v) => (v ? v : undefined)),
});

export async function createInventoryItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireDashboardRole("management");

  const parsed = createItemSchema.safeParse({
    name: formData.get("name") ?? "",
    category: formData.get("category") ?? "",
    unit: formData.get("unit") || "pcs",
    quantity: formData.get("quantity") ?? 0,
    reorderLevel: formData.get("reorderLevel") ?? 0,
    location: formData.get("location") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const db = getDb();
  const [item] = await db
    .insert(inventoryItems)
    .values({
      name: parsed.data.name,
      category: parsed.data.category ?? null,
      unit: parsed.data.unit,
      quantity: parsed.data.quantity,
      reorderLevel: parsed.data.reorderLevel,
      location: parsed.data.location ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning({ id: inventoryItems.id, name: inventoryItems.name, quantity: inventoryItems.quantity });

  if (parsed.data.quantity !== 0) {
    await db.insert(inventoryMovements).values({
      itemId: item.id,
      type: "in",
      quantity: parsed.data.quantity,
      reason: "Initial stock",
      createdBy: (await getActor()).id,
    });
  }

  const actor = await getActor();
  await db.insert(activityLog).values({
    actorId: actor.id,
    actorName: actor.name,
    action: "inventory_item_created",
    detail: `${item.name} · ${item.quantity} ${parsed.data.unit}${parsed.data.category ? ` · ${parsed.data.category}` : ""}`,
  });

  revalidateInventory();
  return { ok: true, message: `Inventory item "${parsed.data.name}" added.` };
}

const MOVEMENT_TYPES = ["in", "out", "adjust"] as const;

const adjustSchema = z
  .object({
    itemId: z.string().uuid("Select an item"),
    type: z.enum(MOVEMENT_TYPES),
    quantity: z.coerce.number().int("Enter a whole number"),
    reason: z.string().trim().max(160).optional().transform((v) => (v ? v : undefined)),
  })
  .superRefine((val, ctx) => {
    if (val.type === "in" || val.type === "out") {
      if (val.quantity <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["quantity"], message: "Quantity must be greater than 0" });
    } else if (val.type === "adjust") {
      if (val.quantity === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["quantity"], message: "Adjustment cannot be 0" });
    }
  });

export async function adjustInventoryStock(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireDashboardRole("management");

  const parsed = adjustSchema.safeParse({
    itemId: formData.get("itemId") ?? "",
    type: formData.get("type") ?? "",
    quantity: formData.get("quantity") ?? "",
    reason: formData.get("reason") ?? "",
  });

  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const db = getDb();
  const [item] = await db
    .select({ id: inventoryItems.id, name: inventoryItems.name, quantity: inventoryItems.quantity, unit: inventoryItems.unit })
    .from(inventoryItems)
    .where(eq(inventoryItems.id, parsed.data.itemId))
    .limit(1);

  if (!item) return { ok: false, errors: { itemId: ["Selected item was not found."] } };

  const delta =
    parsed.data.type === "in"
      ? parsed.data.quantity
      : parsed.data.type === "out"
        ? -parsed.data.quantity
        : parsed.data.quantity; // adjust: signed delta

  const newQty = item.quantity + delta;
  if (newQty < 0) {
    return { ok: false, errors: { quantity: [`Not enough stock. Current quantity is ${item.quantity} ${item.unit}.`] } };
  }

  await db
    .update(inventoryItems)
    .set({ quantity: newQty, updatedAt: new Date() })
    .where(eq(inventoryItems.id, item.id));

  const actor = await getActor();
  await db.insert(inventoryMovements).values({
    itemId: item.id,
    type: parsed.data.type,
    quantity: delta,
    reason: parsed.data.reason ?? null,
    createdBy: actor.id,
  });

  const sign = delta > 0 ? "+" : "";
  await db.insert(activityLog).values({
    actorId: actor.id,
    actorName: actor.name,
    action: "inventory_stock_adjusted",
    detail: `${item.name}: ${sign}${delta} ${item.unit} → ${newQty} ${item.unit}${parsed.data.reason ? ` · ${parsed.data.reason}` : ""}`,
  });

  revalidateInventory();
  return { ok: true, message: `Stock updated for "${item.name}" (${sign}${delta} ${item.unit}, now ${newQty}).` };
}

export async function listRecentInventoryMovements(limit = 50) {
  const db = getDb();
  return db
    .select({
      id: inventoryMovements.id,
      type: inventoryMovements.type,
      quantity: inventoryMovements.quantity,
      reason: inventoryMovements.reason,
      createdAt: inventoryMovements.createdAt,
      itemName: inventoryItems.name,
      unit: inventoryItems.unit,
    })
    .from(inventoryMovements)
    .innerJoin(inventoryItems, eq(inventoryMovements.itemId, inventoryItems.id))
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(limit);
}
