import Link from "next/link";
import type { DashboardRole } from "@/lib/auth/roles";

type DashboardKey = "management" | "front_desk" | "crm";

const items: { key: DashboardKey; label: string; href: string }[] = [
  { key: "management", label: "Management", href: "/management" },
  { key: "front_desk", label: "Front desk", href: "/front-desk" },
  { key: "crm", label: "CRM", href: "/crm" },
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
  if (viewerRole !== "management") return null;

  return (
    <nav className={className} aria-label="Switch dashboard" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {items.map((item) => {
        const active = item.key === current;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={active ? "row-action row-action--primary" : "row-action"}
            aria-current={active ? "page" : undefined}
            style={{ textDecoration: "none" }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
