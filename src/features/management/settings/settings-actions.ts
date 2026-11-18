"use server";

import { revalidatePath } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { requireDashboardRole } from "@/lib/auth/roles";

export type ActionState = { ok: boolean; message?: string; errors?: Record<string, string[]> };
export type SimpleState = { ok: boolean; message?: string };

export type ManagedRole = "management" | "front_desk" | "crm" | "none";

const ROLE_VALUES = ["management", "front_desk", "crm", "none"] as const;

function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

async function getClient() {
  // Clerk v5+ exposes clerkClient as async getter in server contexts
  return await clerkClient();
}

function revalidateSettings() {
  revalidatePath("/management/settings");
  revalidatePath("/access-pending");
}

const inviteSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  role: z.enum(["management", "front_desk", "crm"]),
});

export async function inviteStaffUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireDashboardRole("management");
  const parsed = inviteSchema.safeParse({
    email: formData.get("email") ?? "",
    role: formData.get("role") ?? "",
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  try {
    const client = await getClient();
    await client.invitations.createInvitation({
      emailAddress: parsed.data.email,
      publicMetadata: { role: parsed.data.role },
      ignoreExisting: true,
    });
    revalidateSettings();
    return { ok: true, message: `Invitation sent to ${parsed.data.email} (${parsed.data.role.replace("_", " ")}). After sign-up, confirm their role below if needed.` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create invitation.";
    return { ok: false, message };
  }
}

const roleSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(ROLE_VALUES),
});

export async function updateUserRole(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  await requireDashboardRole("management");
  const parsed = roleSchema.safeParse({ userId: formData.get("userId"), role: formData.get("role") });
  if (!parsed.success) return { ok: false, message: "Invalid role update." };

  try {
    const client = await getClient();
    const user = await client.users.getUser(parsed.data.userId);
    const existing = (user.privateMetadata ?? {}) as Record<string, unknown>;
    const next = { ...existing } as Record<string, unknown>;
    if (parsed.data.role === "none") {
      delete next.role;
    } else {
      next.role = parsed.data.role;
    }
    await client.users.updateUserMetadata(parsed.data.userId, { privateMetadata: next });
    revalidateSettings();
    return { ok: true, message: "User role updated." };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update role.";
    return { ok: false, message };
  }
}

const userIdSchema = z.object({ userId: z.string().trim().min(1) });

export async function setUserActiveState(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  await requireDashboardRole("management");
  const parsed = userIdSchema.safeParse({ userId: formData.get("userId") });
  const active = formData.get("active") === "true";
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  const { userId: selfId } = await auth();
  if (selfId === parsed.data.userId && !active) {
    return { ok: false, message: "You cannot deactivate your own account." };
  }

  try {
    const client = await getClient();
    if (active) {
      await client.users.unbanUser(parsed.data.userId);
    } else {
      await client.users.banUser(parsed.data.userId);
    }
    revalidateSettings();
    return { ok: true, message: active ? "User reactivated." : "User deactivated." };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update user status.";
    return { ok: false, message };
  }
}

export async function deleteStaffUser(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  await requireDashboardRole("management");
  const parsed = userIdSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  const { userId: selfId } = await auth();
  if (selfId === parsed.data.userId) {
    return { ok: false, message: "You cannot delete your own account." };
  }

  try {
    const client = await getClient();
    await client.users.deleteUser(parsed.data.userId);
    revalidateSettings();
    return { ok: true, message: "User deleted." };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete user.";
    return { ok: false, message };
  }
}

export type SettingsUser = {
  id: string;
  name: string;
  email: string;
  role: ManagedRole;
  banned: boolean;
  lastSignInAt: number | null;
  createdAt: number;
  imageUrl: string;
};

export async function listStaffUsers(): Promise<{ users: SettingsUser[]; error?: string }> {
  await requireDashboardRole("management");
  try {
    const client = await getClient();
    const res = await client.users.getUserList({ limit: 100, orderBy: "-created_at" });
    const users = res.data.map((u) => {
      const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.primaryEmailAddress?.emailAddress || "User";
      const email = u.primaryEmailAddress?.emailAddress || u.emailAddresses[0]?.emailAddress || "—";
      const roleVal = (u.privateMetadata as Record<string, unknown> | null | undefined)?.role;
      const role: ManagedRole =
        roleVal === "management" || roleVal === "front_desk" || roleVal === "crm" ? roleVal : "none";
      return {
        id: u.id,
        name,
        email,
        role,
        banned: Boolean(u.banned),
        lastSignInAt: u.lastSignInAt ? Number(u.lastSignInAt) : null,
        createdAt: Number(u.createdAt),
        imageUrl: u.imageUrl,
      } satisfies SettingsUser;
    });
    return { users };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load users from Clerk.";
    return { users: [], error: message };
  }
}
