import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";
import { requireDashboardRole } from "@/lib/auth/roles";
import { getDb } from "@/db";
import { inventoryItems, inventoryMovements } from "@/db/schema";
import { ManagementShell } from "@/features/management/management-shell";
import { AdjustStockForm, InventoryItemForm } from "@/features/management/inventory/inventory-forms";

export const metadata: Metadata = {
  title: "Inventory",
  description: "Manage stock items, levels, and movement history.",
};

function formatWhen(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

const movementLabels: Record<string, string> = {
  in: "Stock in",
  out: "Stock out",
  adjust: "Adjustment",
};

function movementPill(type: string): string {
  if (type === "in") return "status-pill status-pill--checked";
  if (type === "out") return "status-pill status-pill--alert";
  return "status-pill";
}

export default async function InventoryPage() {
  await requireDashboardRole("management");
  const db = getDb();

  const [items, movements] = await Promise.all([
    db.select().from(inventoryItems).orderBy(asc(inventoryItems.name)),
    db
      .select({
        id: inventoryMovements.id,
        type: inventoryMovements.type,
        quantity: inventoryMovements.quantity,
        reason: inventoryMovements.reason,
        createdAt: inventoryMovements.createdAt,
        itemName: inventoryItems.name,
        unit: inventoryItems.unit,
      })
      .from(inventoryMovements)
      .innerJoin(inventoryItems, eq(inventoryMovements.itemId, inventoryItems.id))
      .orderBy(desc(inventoryMovements.createdAt))
      .limit(100),
  ]);

  const lowStockCount = items.filter((i) => i.quantity <= i.reorderLevel).length;

  return (
    <ManagementShell activeNav="Inventory">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">HOTEL OPERATIONS <span className="live-dot" /> INVENTORY</p>
          <h1>Inventory</h1>
          <p className="welcome-subtitle">Track stock items, levels, adjustments, and movement history.</p>
        </div>
        <div className="date-filter">
          <span>{items.length} {items.length === 1 ? "item" : "items"}{lowStockCount > 0 ? ` · ${lowStockCount} low/reorder` : ""}</span>
        </div>
      </div>

      <section className="overview-grid">
        <article className="panel" style={{ minWidth: 0 }}>
          <div className="panel-heading">
            <div><h2>Stock items</h2><p>Current supplies, quantities, and reorder levels</p></div>
          </div>
          <div className="table-wrap">
            {items.length === 0 ? (
              <p className="empty-search">No inventory items yet. Add your first item to start tracking stock.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>ITEM</th>
                    <th>CATEGORY</th>
                    <th>LOCATION</th>
                    <th>ON HAND</th>
                    <th>REORDER AT</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const low = item.quantity <= item.reorderLevel;
                    return (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.name}</strong>
                          {item.notes ? <><br /><small style={{ color: "var(--muted)" }}>{item.notes}</small></> : null}
                        </td>
                        <td>{item.category || <span style={{ color: "var(--muted)" }}>—</span>}</td>
                        <td>{item.location || <span style={{ color: "var(--muted)" }}>—</span>}</td>
                        <td><strong>{item.quantity}</strong> <small>{item.unit}</small></td>
                        <td>{item.reorderLevel} <small>{item.unit}</small></td>
                        <td>
                          <span className={low ? "status-pill status-pill--alert" : "status-pill status-pill--checked"}>
                            <i />{low ? "Low / reorder" : "OK"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div><h2>Add item</h2><p>Create a new inventory item or supply</p></div>
          </div>
          <InventoryItemForm />
          <div style={{ marginTop: 18 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>Record stock movement</h3>
            {items.length === 0 ? (
              <p className="empty-search" style={{ textAlign: "left" }}>Add an item first to record stock in/out adjustments.</p>
            ) : (
              <AdjustStockForm items={items.map((i) => ({ id: i.id, label: `${i.name} (${i.quantity} ${i.unit})` }))} />
            )}
          </div>
        </article>
      </section>

      <section className="overview-grid" style={{ gridTemplateColumns: "1fr" }}>
        <article className="panel" style={{ minWidth: 0 }}>
          <div className="panel-heading">
            <div><h2>Movement log</h2><p>Recent stock received, used, and adjusted</p></div>
          </div>
          <div className="table-wrap">
            {movements.length === 0 ? (
              <p className="empty-search">No stock movements recorded yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>WHEN</th>
                    <th>ITEM</th>
                    <th>TYPE</th>
                    <th>CHANGE</th>
                    <th>REASON</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => {
                    const sign = m.quantity > 0 ? "+" : "";
                    return (
                      <tr key={m.id}>
                        <td>{formatWhen(m.createdAt)}</td>
                        <td><strong>{m.itemName}</strong></td>
                        <td><span className={movementPill(m.type)}><i />{movementLabels[m.type] ?? m.type}</span></td>
                        <td><strong>{sign}{m.quantity}</strong> <small>{m.unit}</small></td>
                        <td>{m.reason || <span style={{ color: "var(--muted)" }}>—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </article>
      </section>

      <footer className="dashboard-footer">
        <span>© 2026 Bros Executive Hotel</span>
        <span>Inventory · Live stock and movement data</span>
      </footer>
    </ManagementShell>
  );
}
