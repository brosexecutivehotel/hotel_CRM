"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { getDb } from "@/db";
import { activityLog, rooms } from "@/db/schema";
import { requireDashboardRole } from "@/lib/auth/roles";

export type RoomFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

const ROOM_STATUSES = ["ready", "cleaning", "reserved", "occupied", "maintenance"] as const;

// Server-side validation — the client form mirrors these rules for UX,
// but this is the enforcement boundary (see AUTHENTICATION.md).
const roomSchema = z.object({
  number: z
    .string()
    .trim()
    .min(1, "Room number is required")
    .max(10, "Room number must be 10 characters or fewer")
    .regex(/^[A-Za-z0-9-]+$/, "Use only letters, numbers, and hyphens"),
  type: z
    .string()
    .trim()
    .min(2, "Room type is required")
    .max(60, "Room type must be 60 characters or fewer"),
  floor: z.coerce
    .number("Floor must be a number")
    .int("Floor must be a whole number")
    .min(0, "Floor cannot be negative")
    .max(200, "Floor must be 200 or less")
    .optional(),
  status: z.enum(ROOM_STATUSES),
});

function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}

export async function createRoom(_prevState: RoomFormState, formData: FormData): Promise<RoomFormState> {
  // Authorization lives at the top of the mutation — Server Actions are
  // reachable via direct POST, not just through the UI.
  await requireDashboardRole("management");

  const floorRaw = formData.get("floor");
  const parsed = roomSchema.safeParse({
    number: formData.get("number") ?? "",
    type: formData.get("type") ?? "",
    floor: floorRaw === null || floorRaw === "" ? undefined : floorRaw,
    status: formData.get("status") || "ready",
  });

  if (!parsed.success) {
    return { ok: false, errors: fieldErrorsFrom(parsed.error) };
  }

  const { number, type, floor, status } = parsed.data;
  const db = getDb();

  try {
    await db
      .insert(rooms)
      .values({ number, type, floor, status });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("rooms_number_unique") || message.includes("duplicate key")) {
      return { ok: false, errors: { number: ["A room with this number already exists."] } };
    }
    throw error;
  }

  const user = await currentUser();
  const actorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "Staff";

  await db.insert(activityLog).values({
    actorId: user?.id ?? null,
    actorName: actorName.slice(0, 120),
    action: "room_created",
    detail: `Room ${number} (${type}) added to the inventory`,
  });

  revalidatePath("/management/rooms");
  return { ok: true, message: `Room ${number} added to the inventory.` };
}
