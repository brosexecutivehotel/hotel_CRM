import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dashboardPaths = {
  management: "/management",
  front_desk: "/front-desk",
  crm: "/crm",
} as const;

export type DashboardRole = keyof typeof dashboardPaths;

function isDashboardRole(role: unknown): role is DashboardRole {
  return typeof role === "string" && Object.prototype.hasOwnProperty.call(dashboardPaths, role);
}

export async function getSignedInDashboardRole(): Promise<DashboardRole> {
  await auth.protect();

  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const role = user.privateMetadata.role;
  if (!isDashboardRole(role)) {
    redirect("/access-pending");
  }

  return role;
}

export async function requireDashboardRole(requiredRole: DashboardRole): Promise<void> {
  const role = await getSignedInDashboardRole();

  if (role !== requiredRole) {
    redirect(dashboardPaths[role]);
  }
}
