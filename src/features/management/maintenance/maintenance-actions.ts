"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activityLog, maintenanceLogs, maintenanceWorkOrders, rooms } from "@/db/schema";
import { requireDashboardRole } from "@/lib/auth/roles";

export type ActionState = { ok: boolean; message?: string; errors?: Record<string, string[]> };
export type SimpleState = { ok: boolean; message?: string };

const STATUSES = ["open", "in_progress", "resolved", "cancelled"] as const;
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

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

function revalidateMaintenance() {
  revalidatePath("/management/maintenance");
  revalidatePath("/management/rooms");
  revalidatePath("/management");
  revalidatePath("/front-desk");
}

async function syncRoomForStatus(roomId: string | null, status: (typeof STATUSES)[number]) {
  if (!roomId) return;
  const db = getDb();
  if (status === "open" || status === "in_progress") {
    await db.update(rooms).set({ status: "maintenance", updatedAt: new Date() }).where(eq(rooms.id, roomId));
  } else if (status === "resolved" || status === "cancelled") {
    await db.update(rooms).set({ status: "ready", updatedAt: new Date() }).where(eq(rooms.id, roomId));
  }
}

const createSchema = z
  .object({
    roomId: z.string().uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
    area: z.string().trim().max(120).optional().transform((v) => (v ? v : undefined)),
    title: z.string().trim().min(3, "Describe the issue (at least 3 characters)").max(160),
    description: z.string().trim().max(2000).optional().transform((v) => (v ? v : undefined)),
    priority: z.enum(PRIORITIES),
    assignedTo: z.string().trim().max(120).optional().transform((v) => (v ? v : undefined)),
    reportedBy: z.string().trim().max(120).optional().transform((v) => (v ? v : undefined)),
  })
  .superRefine((val, ctx) => {
    if (!val.roomId && !val.area) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["area"], message: "Select a room or specify an area/location." });
    }
  });

export async function createMaintenanceWorkOrder(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireDashboardRole("management");

  const parsed = createSchema.safeParse({
    roomId: formData.get("roomId") ?? "",
    area: formData.get("area") ?? "",
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    priority: formData.get("priority") || "medium",
    assignedTo: formData.get("assignedTo") ?? "",
    reportedBy: formData.get("reportedBy") ?? "",
  });

  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const db = getDb();
  let roomLabel = parsed.data.area ?? "Area";

  if (parsed.data.roomId) {
    const [room] = await db.select({ id: rooms.id, number: rooms.number }).from(rooms).where(eq(rooms.id, parsed.data.roomId)).limit(1);
    if (!room) return { ok: false, errors: { roomId: ["Selected room was not found."] } };
    roomLabel = `Room ${room.number}${parsed.data.area ? ` · ${parsed.data.area}` : ""}`;
  }

  const actor = await getActor();
  const [order] = await db
    .insert(maintenanceWorkOrders)
    .values({
      roomId: (parsed.data.roomId as string | undefined) ?? null,
      area: parsed.data.area ?? null,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      priority: parsed.data.priority,
      status: "open",
      assignedTo: parsed.data.assignedTo ?? null,
      reportedBy: parsed.data.reportedBy ?? null,
      createdBy: actor.id,
    })
    .returning({ id: maintenanceWorkOrders.id, title: maintenanceWorkOrders.title });

  await db.insert(maintenanceLogs).values({
    workOrderId: order.id,
    note: `Work order created (${parsed.data.priority} priority).${parsed.data.assignedTo ? ` Assigned to ${parsed.data.assignedTo}.` : ""}`,
    status: "open",
    createdBy: actor.id,
  });

  await syncRoomForStatus((parsed.data.roomId as string | undefined) ?? null, "open");

  await db.insert(activityLog).values({
    actorId: actor.id,
    actorName: actor.name,
    action: "maintenance_created",
    detail: `${roomLabel} · ${parsed.data.title} (${parsed.data.priority})`,
  });

  revalidateMaintenance();
  return { ok: true, message: "Maintenance work order created." };
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(STATUSES),
  note: z.string().trim().max(1000).optional().transform((v) => (v ? v : undefined)),
});

export async function updateMaintenanceStatus(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  await requireDashboardRole("management");
  const parsed = statusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { ok: false, message: "Invalid status update." };

  const db = getDb();
  const [row] = await db
    .select({
      id: maintenanceWorkOrders.id,
      status: maintenanceWorkOrders.status,
      title: maintenanceWorkOrders.title,
      roomId: maintenanceWorkOrders.roomId,
      area: maintenanceWorkOrders.area,
      roomNumber: rooms.number,
    })
    .from(maintenanceWorkOrders)
    .leftJoin(rooms, eq(maintenanceWorkOrders.roomId, rooms.id))
    .where(eq(maintenanceWorkOrders.id, parsed.data.id))
    .limit(1);

  if (!row) return { ok: false, message: "Work order not found." };
  if (row.status === parsed.data.status && !parsed.data.note) return { ok: true, message: "No changes." };

  const now = new Date();
  await db
    .update(maintenanceWorkOrders)
    .set({
      status: parsed.data.status,
      updatedAt: now,
      resolvedAt: parsed.data.status === "resolved" ? now : row.status === "resolved" ? null : undefined,
    })
    .where(eq(maintenanceWorkOrders.id, row.id));

  const actor = await getActor();
  await db.insert(maintenanceLogs).values({
    workOrderId: row.id,
    note: parsed.data.note || `Status changed to ${parsed.data.status.replace("_", " ")}.`,
    status: parsed.data.status,
    createdBy: actor.id,
  });

  await syncRoomForStatus(row.roomId, parsed.data.status);

  const action =
    parsed.data.status === "resolved"
      ? "maintenance_resolved"
      : parsed.data.status === "in_progress"
        ? "maintenance_started"
        : "maintenance_updated";
  const location = row.roomNumber ? `Room ${row.roomNumber}` : row.area || "Area";
  await db.insert(activityLog).values({
    actorId: actor.id,
    actorName: actor.name,
    action,
    detail: `${location} · ${row.title} → ${parsed.data.status.replace("_", " ")}`,
  });

  revalidateMaintenance();
  return { ok: true, message: "Work order updated." };
}

const logSchema = z.object({
  workOrderId: z.string().uuid(),
  note: z.string().trim().min(2, "Enter a note").max(1000),
});

export async function addMaintenanceLog(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireDashboardRole("management");
  const parsed = logSchema.safeParse({ workOrderId: formData.get("workOrderId"), note: formData.get("note") ?? "" });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const db = getDb();
  const [row] = await db
    .select({ id: maintenanceWorkOrders.id, status: maintenanceWorkOrders.status, title: maintenanceWorkOrders.title })
    .from(maintenanceWorkOrders)
    .where(eq(maintenanceWorkOrders.id, parsed.data.workOrderId))
    .limit(1);
  if (!row) return { ok: false, message: "Work order not found." };

  const actor = await getActor();
  await db.insert(maintenanceLogs).values({
    workOrderId: row.id,
    note: parsed.data.note,
    status: row.status,
    createdBy: actor.id,
  });
  await db.update(maintenanceWorkOrders).set({ updatedAt: new Date() }).where(eq(maintenanceWorkOrders.id, row.id));

  await db.insert(activityLog).values({
    actorId: actor.id,
    actorName: actor.name,
    action: "maintenance_updated",
    detail: `${row.title} · log added`,
  });

  revalidateMaintenance();
  return { ok: true, message: "Log note added." };
}
