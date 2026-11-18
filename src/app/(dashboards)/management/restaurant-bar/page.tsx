import type { Metadata } from "next";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { requireDashboardRole } from "@/lib/auth/roles";
import { getDb } from "@/db";
import { fbMenuCategories, fbMenuItems, fbOrderItems, fbOrders, guests, reservations, rooms } from "@/db/schema";
import { ManagementShell } from "@/features/management/management-shell";
import { CategoryForm, MenuItemForm } from "@/features/management/restaurant-bar/restaurant-menu-forms";
import { AddItemForm, CreateOrderForm } from "@/features/management/restaurant-bar/restaurant-order-forms";
import { OrderStatusActions } from "@/features/management/restaurant-bar/restaurant-order-actions-ui";

export const metadata: Metadata = {
  title: "Restaurant & bar",
  description: "Manage menu, orders, and F&B charges.",
};

function money(v: string | number) {
  return `USD ${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const orderStatusLabels: Record<string, string> = { open: "Open", served: "Served", paid: "Paid", cancelled: "Cancelled" };
function orderPill(status: string) {
  if (status === "paid") return "status-pill status-pill--checked";
  if (status === "cancelled") return "status-pill status-pill--alert";
  return "status-pill";
}

export default async function RestaurantBarPage() {
  await requireDashboardRole("management");
  const db = getDb();

  const [categories, menuItems, orders, reservationRows] = await Promise.all([
    db.select().from(fbMenuCategories).orderBy(asc(fbMenuCategories.sortOrder), asc(fbMenuCategories.name)),
    db.select({ id: fbMenuItems.id, name: fbMenuItems.name, price: fbMenuItems.price, active: fbMenuItems.active, categoryId: fbMenuItems.categoryId, categoryName: fbMenuCategories.name })
      .from(fbMenuItems)
      .leftJoin(fbMenuCategories, eq(fbMenuItems.categoryId, fbMenuCategories.id))
      .orderBy(asc(fbMenuItems.name)),
    db.select({
      id: fbOrders.id, reference: fbOrders.reference, status: fbOrders.status, tableLabel: fbOrders.tableLabel,
      guestName: fbOrders.guestName, notes: fbOrders.notes, createdAt: fbOrders.createdAt, updatedAt: fbOrders.updatedAt,
      reservationRef: reservations.reference, roomNumber: rooms.number,
    })
      .from(fbOrders)
      .leftJoin(reservations, eq(fbOrders.reservationId, reservations.id))
      .leftJoin(rooms, eq(fbOrders.roomId, rooms.id))
      .orderBy(desc(fbOrders.updatedAt), desc(fbOrders.createdAt))
      .limit(50),
    db.select({ id: reservations.id, reference: reservations.reference, guestName: guests.name, roomNumber: rooms.number })
      .from(reservations).innerJoin(guests, eq(reservations.guestId, guests.id)).innerJoin(rooms, eq(reservations.roomId, rooms.id))
      .orderBy(desc(reservations.createdAt)).limit(100),
  ]);

  const orderIds = orders.map((o) => o.id);
  const items = orderIds.length
    ? await db.select({ id: fbOrderItems.id, orderId: fbOrderItems.orderId, description: fbOrderItems.description, quantity: fbOrderItems.quantity, unitPrice: fbOrderItems.unitPrice, lineTotal: fbOrderItems.lineTotal })
        .from(fbOrderItems).where(inArray(fbOrderItems.orderId, orderIds)).orderBy(asc(fbOrderItems.createdAt))
    : [];
  const itemsByOrder = new Map<string, typeof items>();
  const totals = new Map<string, number>();
  for (const it of items) {
    (itemsByOrder.get(it.orderId) ?? itemsByOrder.set(it.orderId, []).get(it.orderId)!).push(it);
    totals.set(it.orderId, (totals.get(it.orderId) ?? 0) + Number(it.lineTotal));
  }

  const categoryOpts = categories.map((c) => ({ id: c.id, name: c.name }));
  const activeMenuItems = menuItems.filter((m) => m.active === 1);
  const openOrders = orders.filter((o) => o.status === "open" || o.status === "served");

  return (
    <ManagementShell activeNav="Restaurant & bar">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">HOTEL OPERATIONS <span className="live-dot" /> RESTAURANT & BAR</p>
          <h1>Restaurant &amp; bar</h1>
          <p className="welcome-subtitle">Manage menu items, take orders/tabs, and log F&amp;B charges.</p>
        </div>
        <div className="date-filter"><span>{orders.length} recent orders · {activeMenuItems.length} active items</span></div>
      </div>

      <section className="overview-grid">
        <article className="panel" style={{ minWidth: 0 }}>
          <div className="panel-heading"><div><h2>Menu</h2><p>Categories and items available for ordering</p></div></div>
          {menuItems.length === 0 ? (
            <p className="empty-search">No menu items yet. Add categories and items using the forms.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>ITEM</th><th>CATEGORY</th><th>PRICE</th><th>STATUS</th></tr></thead>
                <tbody>
                  {menuItems.map((m) => (
                    <tr key={m.id}>
                      <td><strong>{m.name}</strong></td>
                      <td>{m.categoryName ?? <span style={{ color: "var(--muted)" }}>—</span>}</td>
                      <td>{money(m.price)}</td>
                      <td><span className={m.active ? "status-pill status-pill--checked" : "status-pill status-pill--alert"}><i />{m.active ? "Active" : "Inactive"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
            <div><h3 style={{ margin: "0 0 8px", fontSize: 13 }}>Add category</h3><CategoryForm /></div>
            <div><h3 style={{ margin: "0 0 8px", fontSize: 13 }}>Add menu item</h3><MenuItemForm categories={categoryOpts} /></div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading"><div><h2>New order / tab</h2><p>Open an order for a table, guest, or room</p></div></div>
          <CreateOrderForm reservations={reservationRows.map((r) => ({ id: r.id, label: `${r.reference} · ${r.guestName} · Room ${r.roomNumber}` }))} />
          <div style={{ marginTop: 18 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>Add item or log charge</h3>
            {openOrders.length === 0 ? (
              <p className="empty-search" style={{ textAlign: "left" }}>Create an open order first to add items/charges.</p>
            ) : (
              <AddItemForm
                orders={openOrders.map((o) => ({ id: o.id, label: `${o.reference}${o.tableLabel ? ` · ${o.tableLabel}` : ""}${o.guestName ? ` · ${o.guestName}` : ""}` }))}
                menuItems={activeMenuItems.map((m) => ({ id: m.id, label: m.name, price: Number(m.price).toFixed(2) }))}
              />
            )}
          </div>
        </article>
      </section>

      <section className="overview-grid" style={{ gridTemplateColumns: "1fr" }}>
        <article className="panel" style={{ minWidth: 0 }}>
          <div className="panel-heading"><div><h2>Orders &amp; charges</h2><p>Recent orders, tabs, and logged F&amp;B charges</p></div></div>
          {orders.length === 0 ? (
            <p className="empty-search">No orders yet. Create an order/tab to start logging items and charges.</p>
          ) : (
            <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
              {orders.map((o) => {
                const its = itemsByOrder.get(o.id) ?? [];
                const total = totals.get(o.id) ?? 0;
                return (
                  <div key={o.id} style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: 14, background: "var(--surface)" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <strong className="room-number">{o.reference}</strong>{" "}
                        <span className={orderPill(o.status)}><i />{orderStatusLabels[o.status] ?? o.status}</span>
                        <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
                          {[o.tableLabel, o.guestName, o.reservationRef ? `Res ${o.reservationRef}` : null, o.roomNumber ? `Room ${o.roomNumber}` : null].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div><strong>{money(total)}</strong></div>
                        <small style={{ color: "var(--muted)" }}>{its.length} {its.length === 1 ? "item" : "items"}</small>
                      </div>
                    </div>
                    {its.length > 0 && (
                      <div className="table-wrap" style={{ marginTop: 10 }}>
                        <table>
                          <thead><tr><th>ITEM / CHARGE</th><th>QTY</th><th>UNIT</th><th>TOTAL</th></tr></thead>
                          <tbody>
                            {its.map((it) => (
                              <tr key={it.id}>
                                <td>{it.description}</td>
                                <td>{it.quantity}</td>
                                <td>{money(it.unitPrice)}</td>
                                <td><strong>{money(it.lineTotal)}</strong></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {o.notes && <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 12 }}>Note: {o.notes}</p>}
                    <div style={{ marginTop: 10 }}><OrderStatusActions orderId={o.id} status={o.status as "open" | "served" | "paid" | "cancelled"} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>

      <footer className="dashboard-footer">
        <span>© 2026 Bros Executive Hotel</span>
        <span>Restaurant &amp; bar · Menu, orders, and charges</span>
      </footer>
    </ManagementShell>
  );
}
