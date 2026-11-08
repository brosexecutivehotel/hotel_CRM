import type { Metadata } from "next";
import { requireDashboardRole } from "@/lib/auth/roles";
import ManagementDashboard from "@/features/management/management-dashboard";

export const metadata: Metadata = {
  title: "Management dashboard",
  description: "Property-wide hotel performance and operational overview.",
};

export default async function ManagementPage() {
  await requireDashboardRole("management");
  return <ManagementDashboard />;
}
