import type { Metadata } from "next";
import { requireDashboardRole } from "@/lib/auth/roles";
import FrontDeskDashboard from "@/features/front-desk/front-desk-dashboard";

export const metadata: Metadata = {
  title: "Front desk",
  description: "Front desk arrivals, departures, and room readiness.",
};

export default async function FrontDeskPage() {
  await requireDashboardRole("front_desk");
  return <FrontDeskDashboard />;
}
