import { redirect } from "next/navigation";
import { dashboardPaths, getSignedInDashboardRole } from "@/lib/auth/roles";

export default async function HomePage() {
  const role = await getSignedInDashboardRole();
  redirect(dashboardPaths[role]);
}
