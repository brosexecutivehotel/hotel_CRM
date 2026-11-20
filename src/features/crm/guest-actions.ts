"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activityLog, guests } from "@/db/schema";
import { requireDashboardRole } from "@/lib/auth/roles";

export type GuestFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

const GUEST_SEGMENTS = ["vip", "returning", "corporate", "new"] as const;

const schema = z.object({
  id: z.string().uuid("Invalid guest"),
  name: z.string().trim().min(2, "Guest name is required").max(120),
  email: z
    .string()
    .trim()
    .max(255)
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(z.string().email("Enter a valid email address").optional()),
  phone: z.string().trim().max(30).optional().transform((v) => (v ? v : undefined)),
  country: z.string().trim().max(80).optional().transform((v) => (v ? v : undefined)),
  segment: z.enum(GUEST_SEGMENTS),
  notes: z.string().trim().max(2000).optional().transform((v) => (v ? v : undefined)),
});

function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}

export async function updateGuest(_prev: GuestFormState, formData: FormData): Promise<GuestFormState> {
  await requireDashboardRole(["crm", "management"]);

  const parsed = schema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    country: formData.get("country") ?? "",
    segment: formData.get("segment") || "new",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, errors: fieldErrorsFrom(parsed.error) };
  }

  const data = parsed.data;
  const db = getDb();

  const [existing] = await db.select({ id: guests.id, name: guests.name }).from(guests).where(eq(guests.id, data.id)).limit(1);
  if (!existing) return { ok: false, message: "Guest profile not found." };

  await db
    .update(guests)
    .set({
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      country: data.country ?? null,
      segment: data.segment,
      notes: data.notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(guests.id, data.id));

  const user = await currentUser();
  const actorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "Staff";

  await db.insert(activityLog).values({
    actorId: user?.id ?? null,
    actorName: actorName.slice(0, 120),
    action: "guest_updated",
    detail: `${data.name} · ${data.segment.replace("_", " ")} segment`,
  });

  revalidatePath("/crm");
  return { ok: true, message: `Guest profile updated for ${data.name}.` };
}
