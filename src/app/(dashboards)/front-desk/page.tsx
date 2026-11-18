import type { Metadata } from "next";
import { requireDashboardRole } from "@/lib/auth/roles";
import FrontDeskDashboard from "@/features/front-desk/front-desk-dashboard";
import { getFrontDeskData } from "@/features/front-desk/front-desk-data-server";

export const metadata: Metadata = {
  title: "Front desk",
  description: "Front desk arrivals, departures, and room readiness.",
};

export default async function FrontDeskPage() {
  const viewerRole = await requireDashboardRole("front_desk");
  const data = await getFrontDeskData();
  return <FrontDeskDashboard data={data} viewerRole={viewerRole} />;
}
