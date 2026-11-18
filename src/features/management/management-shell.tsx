"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { HotelLogo } from "@/components/brand/hotel-logo";
import { Icon } from "@/components/ui/icon";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DashboardSwitcher } from "@/components/ui/dashboard-switcher";
import type { DashboardRole } from "@/lib/auth/roles";
import { managementNavigation as navigation } from "./management-data";

type ManagementShellProps = {
  activeNav: string;
  topbarActions?: ReactNode;
  children: ReactNode;
  dateLabel?: string;
  timeLabel?: string;
  viewerRole?: DashboardRole;
};

export function ManagementShell({ activeNav, topbarActions, children, dateLabel, timeLabel, viewerRole = "management" }: ManagementShellProps) {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/management" aria-label="Bros Executive Hotel home">
          <HotelLogo className="brand-logo" size={42} />
          <span className="brand-copy">
            <strong>BROS EXECUTIVE</strong>
            <span>HOTEL OPERATIONS</span>
          </span>
        </Link>

        <div className="property-switcher">
          <span className="property-icon"><Icon name="bed" size={17} /></span>
          <span className="property-copy"><strong>Main property</strong><small>Juba, South Sudan</small></span>
          <Icon name="chevron" size={15} />
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <div key={item.label}>
              {item.section && <p className="nav-section">{item.section}</p>}
              {item.href ? (
                <Link
                  className={`nav-link${activeNav === item.label ? " nav-link--active" : ""}`}
                  href={item.href}
                  aria-current={activeNav === item.label ? "page" : undefined}
                >
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  className="nav-link nav-link--planned"
                  disabled
                  title="Planned module"
                  aria-label={`${item.label}, planned module`}
                >
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                  {item.label === "Reservations" && <span className="nav-count">8</span>}
                </button>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon"><Icon name="sparkles" size={16} /></span>
            <div><strong>Need a hand?</strong><span>Visit the team help desk</span></div>
            <Icon name="chevron" size={15} />
          </div>
          <div className="profile-button">
            <UserButton />
            <span className="profile-copy"><strong>Signed in</strong><small>Hotel staff account</small></span>
          </div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <HotelLogo className="mobile-brand-logo" size={32} />
          <div className="breadcrumb">
            <Link href="/management" style={{ color: "inherit", textDecoration: "none" }}>Workspace</Link>
            <Icon name="chevron" size={14} />
            <strong>{activeNav}</strong>
          </div>
          <div className="topbar-actions">
            {viewerRole === "management" && <DashboardSwitcher viewerRole={viewerRole} current="management" />}
            {topbarActions}
            <ThemeToggle />
            <span className="icon-button notification-button" aria-label="Notifications">
              <Icon name="bell" size={18} /><span className="notification-dot" />
            </span>
            <span className="topbar-divider" />
            <div className="date-display"><span>{dateLabel ?? "—"}</span><small>{timeLabel ?? "Hotel local time · EAT"}</small></div>
          </div>
        </header>

        <div className="dashboard-content">{children}</div>
      </section>
    </main>
  );
}
