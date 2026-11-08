import type { Metadata } from "next";
import { requireDashboardRole } from "@/lib/auth/roles";
import CrmDashboard from "@/features/crm/crm-dashboard";

export const metadata: Metadata = {
  title: "Guest CRM",
  description: "Guest profiles, loyalty segments, and feedback.",
};

export default async function CrmPage() {
  await requireDashboardRole("crm");
  return <CrmDashboard />;
}
