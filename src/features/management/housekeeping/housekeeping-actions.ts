"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activityLog, housekeepingTasks, rooms } from "@/db/schema";
import { requireDashboardRole } from "@/lib/auth/roles";

export type HousekeepingFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export type HousekeepingActionState = {
  ok: boolean;
  message?: string;
};

const TASK_STATUSES = ["pending", "in_progress", "done"] as const;

const createSchema = z.object({
  roomId: z.string().uuid("Select a room"),
  assignedTo: z.string().trim().max(120).optional().transform((v) => (v ? v : undefined)),
  status: z.enum(TASK_STATUSES),
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

function revalidateHousekeepingViews() {
  revalidatePath("/management/housekeeping");
  revalidatePath("/management/rooms");
  revalidatePath("/management");
  revalidatePath("/front-desk");
}

async function syncRoomForTaskStatus(roomId: string, status: (typeof TASK_STATUSES)[number]) {
  const db = getDb();
  if (status === "in_progress" || status === "pending") {
    await db.update(rooms).set({ status: "cleaning", updatedAt: new Date() }).where(eq(rooms.id, roomId));
  } else if (status === "done") {
    await db.update(rooms).set({ status: "ready", updatedAt: new Date() }).where(eq(rooms.id, roomId));
  }
}

export async function createHousekeepingTask(
  _prev: HousekeepingFormState,
  formData: FormData,
): Promise<HousekeepingFormState> {
  await requireDashboardRole("management");

  const parsed = createSchema.safeParse({
    roomId: formData.get("roomId") ?? "",
    assignedTo: formData.get("assignedTo") ?? "",
    status: formData.get("status") || "pending",
  });

  if (!parsed.success) {
    return { ok: false, errors: fieldErrorsFrom(parsed.error) };
  }

  const db = getDb();
  const [room] = await db
    .select({ id: rooms.id, number: rooms.number })
    .from(rooms)
    .where(eq(rooms.id, parsed.data.roomId))
    .limit(1);
  if (!room) return { ok: false, errors: { roomId: ["Selected room was not found."] } };

  await db.insert(housekeepingTasks).values({
    roomId: parsed.data.roomId,
    assignedTo: parsed.data.assignedTo ?? null,
    status: parsed.data.status,
  });

  await syncRoomForTaskStatus(parsed.data.roomId, parsed.data.status);

  const actor = await getActor();
  const who = parsed.data.assignedTo ? ` · Assigned to ${parsed.data.assignedTo}` : "";
  await db.insert(activityLog).values({
    actorId: actor.id,
    actorName: actor.name,
    action: "housekeeping_task_created",
    detail: `Room ${room.number} · ${parsed.data.status.replace("_", " ")}${who}`,
  });

  revalidateHousekeepingViews();
  return { ok: true, message: `Housekeeping task created for Room ${room.number}.` };
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(TASK_STATUSES),
});

export async function updateHousekeepingTaskStatus(
  _prev: HousekeepingActionState,
  formData: FormData,
): Promise<HousekeepingActionState> {
  await requireDashboardRole("management");
  const parsed = statusSchema.safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) return { ok: false, message: "Invalid task update." };

  const db = getDb();
  const [row] = await db
    .select({
      id: housekeepingTasks.id,
      status: housekeepingTasks.status,
      roomId: housekeepingTasks.roomId,
      assignedTo: housekeepingTasks.assignedTo,
      roomNumber: rooms.number,
    })
    .from(housekeepingTasks)
    .innerJoin(rooms, eq(housekeepingTasks.roomId, rooms.id))
    .where(eq(housekeepingTasks.id, parsed.data.id))
    .limit(1);

  if (!row) return { ok: false, message: "Task not found." };
  if (row.status === parsed.data.status) return { ok: true, message: "No changes." };

  await db
    .update(housekeepingTasks)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(housekeepingTasks.id, row.id));

  await syncRoomForTaskStatus(row.roomId, parsed.data.status);

  const actor = await getActor();
  const action =
    parsed.data.status === "done"
      ? "housekeeping_task_done"
      : parsed.data.status === "in_progress"
        ? "housekeeping_task_started"
        : "housekeeping_task_created";
  await db.insert(activityLog).values({
    actorId: actor.id,
    actorName: actor.name,
    action,
    detail: `Room ${row.roomNumber} · ${parsed.data.status.replace("_", " ")}${row.assignedTo ? ` · ${row.assignedTo}` : ""}`,
  });

  revalidateHousekeepingViews();
  return { ok: true, message: `Task updated for Room ${row.roomNumber}.` };
}
