import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { requireDashboardRole } from "@/lib/auth/roles";
import { getOverviewData } from "@/features/management/overview-data";
import ManagementDashboard from "@/features/management/management-dashboard";

export const metadata: Metadata = {
  title: "Management dashboard",
  description: "Property-wide hotel performance and operational overview.",
};

type Props = {
  searchParams?: Promise<{ date?: string }>;
};

export default async function ManagementPage({ searchParams }: Props) {
  await requireDashboardRole("management");

  const params = (await searchParams) ?? {};
  const [overview, user] = await Promise.all([getOverviewData(params.date), currentUser()]);
  const userName =
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "there";

  return <ManagementDashboard userName={userName} overview={overview} />;
}
