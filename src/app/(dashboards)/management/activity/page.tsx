import type { Metadata } from "next";
import { requireDashboardRole } from "@/lib/auth/roles";
import { getRecentActivity } from "@/features/management/overview-data";
import { ManagementShell } from "@/features/management/management-shell";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Activity log",
  description: "Recent operational activity across the property.",
};

export default async function ActivityPage() {
  await requireDashboardRole("management");
  const activity = await getRecentActivity(100);

  return (
    <ManagementShell activeNav="Overview">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">WORKSPACE <span className="live-dot" /> ACTIVITY LOG</p>
          <h1>Activity log</h1>
          <p className="welcome-subtitle">Latest updates recorded by your team and the system.</p>
        </div>
        <div className="date-filter"><span>{activity.length} recent {activity.length === 1 ? "entry" : "entries"}</span></div>
      </div>

      <section className="overview-grid" style={{ gridTemplateColumns: "1fr" }}>
        <article className="panel">
          <div className="panel-heading">
            <div><h2>Recent activity</h2><p>Most recent events first</p></div>
          </div>
          <div className="activity-list">
            {activity.length === 0 ? (
              <p className="empty-search">No activity recorded yet. Actions like adding rooms will appear here.</p>
            ) : (
              activity.map((item, index) => (
                <div className="activity-item" key={`${item.title}-${item.time}-${index}`}>
                  <span className={`activity-icon activity-icon--${item.tone}`}>
                    <Icon name={item.icon} size={15} />
                  </span>
                  <span className="activity-copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
                  <time>{item.time}</time>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <footer className="dashboard-footer">
        <span>© 2026 Bros Executive Hotel</span>
        <span>Activity log · Live operational data</span>
      </footer>
    </ManagementShell>
  );
}
