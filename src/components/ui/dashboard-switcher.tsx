"use client";

import { useRouter } from "next/navigation";
import type { DashboardRole } from "@/lib/auth/roles";
import RubberSegment from "@/components/ui/rubber-segment";

type DashboardKey = "management" | "front_desk" | "crm";

const items: { value: DashboardKey; label: string; href: string }[] = [
  { value: "management", label: "Management", href: "/management" },
  { value: "front_desk", label: "Front desk", href: "/front-desk" },
  { value: "crm", label: "CRM", href: "/crm" },
];

export function DashboardSwitcher({
  viewerRole,
  current,
  className,
}: {
  viewerRole: DashboardRole;
  current: DashboardKey;
  className?: string;
}) {
  const router = useRouter();
  if (viewerRole !== "management") return null;

  return (
    <RubberSegment
      aria-label="Switch dashboard"
      className={className}
      items={items.map((item) => ({ value: item.value, label: item.label }))}
      value={current}
      onChange={(value) => {
        const target = items.find((item) => item.value === value);
        if (target) router.push(target.href);
      }}
      trackColor="var(--surface-muted)"
      thumbColor="var(--brand-gold)"
      textColor="var(--muted)"
      activeTextColor="#111111"
      size="sm"
      radius={8}
      inset={2}
    />
  );
}
