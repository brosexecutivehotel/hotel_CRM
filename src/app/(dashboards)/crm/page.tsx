import type { Metadata } from "next";
import { requireDashboardRole } from "@/lib/auth/roles";
import CrmDashboard from "@/features/crm/crm-dashboard";
import { getCrmData } from "@/features/crm/crm-data-server";

export const metadata: Metadata = {
  title: "Guest CRM",
  description: "Guest profiles, loyalty segments, and feedback.",
};

export default async function CrmPage() {
  const viewerRole = await requireDashboardRole("crm");
  const data = await getCrmData();
  return <CrmDashboard viewerRole={viewerRole} data={data} />;
}
