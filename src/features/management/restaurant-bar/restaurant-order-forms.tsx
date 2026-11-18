"use client";

import { useActionState, useEffect, useRef } from "react";
import { addOrderItem, createOrder, type ActionState } from "./restaurant-actions";

const initial: ActionState = { ok: false };

type ReservationOpt = { id: string; label: string };
type MenuItemOpt = { id: string; label: string; price: string };
type OrderOpt = { id: string; label: string };

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="field-error" role="alert">{messages.join(" ")}</p>;
}

export function CreateOrderForm({ reservations }: { reservations: ReservationOpt[] }) {
  const [state, action, pending] = useActionState(createOrder, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state.ok]);
  return (
    <form ref={ref} className="room-form" action={action} noValidate>
      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor="ord-table">Table / location</label>
          <input id="ord-table" name="tableLabel" type="text" maxLength={40} placeholder="e.g. Table 4 / Bar" />
        </div>
        <div className="room-form-field">
          <label htmlFor="ord-guest">Guest name</label>
          <input id="ord-guest" name="guestName" type="text" maxLength={120} placeholder="Walk-in or guest name" />
        </div>
      </div>
      <div className="room-form-field">
        <label htmlFor="ord-res">Link to reservation (optional, for room charge)</label>
        <select id="ord-res" name="reservationId" defaultValue="">
          <option value="">No reservation</option>
          {reservations.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <FieldError messages={state.errors?.reservationId} />
      </div>
      <div className="room-form-field">
        <label htmlFor="ord-notes">Notes</label>
        <input id="ord-notes" name="notes" type="text" maxLength={500} placeholder="Optional notes" />
      </div>
      {state.ok && state.message && <p className="form-success" role="status">{state.message}</p>}
      <button className="room-form-submit" type="submit" disabled={pending}>{pending ? "Creating…" : "Create order / tab"}</button>
    </form>
  );
}

export function AddItemForm({ orders, menuItems }: { orders: OrderOpt[]; menuItems: MenuItemOpt[] }) {
  const [state, action, pending] = useActionState(addOrderItem, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state.ok]);
  return (
    <form ref={ref} className="room-form" action={action} noValidate>
      <div className="room-form-field">
        <label htmlFor="ai-order">Order *</label>
        <select id="ai-order" name="orderId" defaultValue="" required>
          <option value="" disabled>Select an open order</option>
          {orders.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
      <div className="room-form-field">
        <label htmlFor="ai-menu">Menu item (optional)</label>
        <select id="ai-menu" name="menuItemId" defaultValue="">
          <option value="">Custom charge / manual entry</option>
          {menuItems.map((m) => <option key={m.id} value={m.id}>{m.label} — USD {m.price}</option>)}
        </select>
      </div>
      <div className="room-form-field">
        <label htmlFor="ai-desc">Description (for custom charge or override)</label>
        <input id="ai-desc" name="description" type="text" maxLength={160} placeholder="e.g. Room service, corkage, extra item" />
        <FieldError messages={state.errors?.description} />
      </div>
      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor="ai-qty">Quantity *</label>
          <input id="ai-qty" name="quantity" type="number" min={1} max={999} defaultValue={1} required />
        </div>
        <div className="room-form-field">
          <label htmlFor="ai-price">Unit price (USD) *</label>
          <input id="ai-price" name="unitPrice" type="number" min={0} step="0.01" placeholder="Auto if menu item selected" aria-invalid={state.errors?.unitPrice ? true : undefined} />
          <FieldError messages={state.errors?.unitPrice} />
        </div>
      </div>
      {state.ok && state.message && <p className="form-success" role="status">{state.message}</p>}
      {!state.ok && state.message && <p className="field-error" role="alert">{state.message}</p>}
      <button className="room-form-submit" type="submit" disabled={pending}>{pending ? "Adding…" : "Add item / charge"}</button>
      <p className="room-form-hint">Select a menu item or enter a custom charge description and price to log F&amp;B charges.</p>
    </form>
  );
}
