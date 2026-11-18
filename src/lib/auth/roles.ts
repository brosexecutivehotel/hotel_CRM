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

/**
 * Ensures the signed-in user can access a dashboard/feature.
 * Management can access all dashboards; other roles can access only their own (or listed roles).
 * Returns the signed-in user's actual role.
 */
export async function requireDashboardRole(requiredRole: DashboardRole | DashboardRole[]): Promise<DashboardRole> {
  const role = await getSignedInDashboardRole();
  const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  if (role === "management" || allowed.includes(role)) {
    return role;
  }

  redirect(dashboardPaths[role]);
}
