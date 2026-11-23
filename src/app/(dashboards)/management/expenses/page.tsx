import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { requireDashboardRole } from "@/lib/auth/roles";
import { getDb } from "@/db";
import { expenses } from "@/db/schema";
import { ManagementShell } from "@/features/management/management-shell";
import { ExpenseForm } from "@/features/management/expenses/expense-form";
import { ExpenseRowActions } from "@/features/management/expenses/expense-row-actions";

export const metadata: Metadata = {
  title: "Expenses",
  description: "Record and track hotel buying and operational expenses.",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
};

const methodLabels: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  mobile_money: "Mobile money",
  bank_transfer: "Bank transfer",
};

function statusPillClass(status: string): string {
  if (status === "paid") return "status-pill status-pill--checked";
  return "status-pill";
}

function formatMoney(amount: string | number, currency: string): string {
  return `${currency} ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string | Date | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(d);
}

export default async function ExpensesPage() {
  await requireDashboardRole("management");

  const db = getDb();
  const rows = await db.select().from(expenses).orderBy(desc(expenses.expenseDate), desc(expenses.createdAt));

  const total = rows.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  const paidTotal = rows.filter((r) => r.status === "paid").reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  const pendingTotal = rows.filter((r) => r.status === "pending").reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  const currency = rows[0]?.currency ?? "USD";

  return (
    <ManagementShell activeNav="Expenses">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">HOTEL OPERATIONS <span className="live-dot" /> EXPENSES</p>
          <h1>Expenses</h1>
          <p className="welcome-subtitle">Track buying, supplier payments, and operational expenses.</p>
        </div>
        <div className="date-filter"><span>{rows.length} {rows.length === 1 ? "record" : "records"}</span></div>
      </div>

      <section className="kpi-grid" aria-label="Expense summary">
        <article className="kpi-card">
          <span className="kpi-label">Total recorded</span>
          <strong className="kpi-value">{formatMoney(total, currency)}</strong>
          <small className="kpi-sub">{rows.length} expense records</small>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Paid</span>
          <strong className="kpi-value">{formatMoney(paidTotal, currency)}</strong>
          <small className="kpi-sub">Settled expenses</small>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Pending</span>
          <strong className="kpi-value">{formatMoney(pendingTotal, currency)}</strong>
          <small className="kpi-sub">Awaiting payment</small>
        </article>
      </section>

      <section className="overview-grid">
        <article className="panel" style={{ minWidth: 0 }}>
          <div className="panel-heading">
            <div><h2>Expense records</h2><p>Buying, payments, and operational costs</p></div>
          </div>
          <div className="table-wrap">
            {rows.length === 0 ? (
              <p className="empty-search">No expenses recorded yet. Use the form to add one.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>CATEGORY</th>
                    <th>DESCRIPTION</th>
                    <th>VENDOR</th>
                    <th>AMOUNT</th>
                    <th>METHOD</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id}>
                      <td>{formatDate(e.expenseDate)}</td>
                      <td><strong className="room-number">{e.category}</strong></td>
                      <td>
                        <div style={{ display: "grid", gap: 2 }}>
                          <span>{e.description}</span>
                          {(e.reference || e.notes) && <small style={{ color: "var(--muted)", fontSize: 10 }}>{[e.reference ? `Ref: ${e.reference}` : null, e.notes].filter(Boolean).join(" · ")}</small>}
                        </div>
                      </td>
                      <td>{e.vendor || "—"}</td>
                      <td><strong>{formatMoney(e.amount, e.currency)}</strong></td>
                      <td>{methodLabels[e.method] ?? e.method}</td>
                      <td><span className={statusPillClass(e.status)}><i />{statusLabels[e.status] ?? e.status}</span></td>
                      <td><ExpenseRowActions expenseId={e.id} status={e.status as "pending" | "paid"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div><h2>Record expense</h2><p>Add a buying/payment expense</p></div>
          </div>
          <ExpenseForm />
        </article>
      </section>

      <footer className="dashboard-footer">
        <span>© 2026 Bros Executive Hotel</span>
        <span>Expenses · Live expense tracking</span>
      </footer>
    </ManagementShell>
  );
}
