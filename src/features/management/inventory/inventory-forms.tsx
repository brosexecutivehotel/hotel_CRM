"use client";

import { useActionState, useEffect, useRef } from "react";
import { adjustInventoryStock, createInventoryItem, type ActionState } from "./inventory-actions";

const initial: ActionState = { ok: false };

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="field-error" role="alert">{messages.join(" ")}</p>;
}

export function InventoryItemForm() {
  const [state, action, pending] = useActionState(createInventoryItem, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} className="room-form" action={action} noValidate>
      <div className="room-form-field">
        <label htmlFor="inv-name">Item name *</label>
        <input id="inv-name" name="name" type="text" maxLength={120} placeholder="e.g. Bath towels" required aria-invalid={state.errors?.name ? true : undefined} />
        <FieldError messages={state.errors?.name} />
      </div>
      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor="inv-category">Category</label>
          <input id="inv-category" name="category" type="text" maxLength={80} placeholder="e.g. Linen, Bar, Cleaning" />
        </div>
        <div className="room-form-field">
          <label htmlFor="inv-unit">Unit *</label>
          <input id="inv-unit" name="unit" type="text" maxLength={30} defaultValue="pcs" placeholder="pcs, kg, bottles" required />
          <FieldError messages={state.errors?.unit} />
        </div>
      </div>
      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor="inv-qty">Quantity on hand</label>
          <input id="inv-qty" name="quantity" type="number" min={0} step={1} defaultValue={0} />
          <FieldError messages={state.errors?.quantity} />
        </div>
        <div className="room-form-field">
          <label htmlFor="inv-reorder">Reorder level</label>
          <input id="inv-reorder" name="reorderLevel" type="number" min={0} step={1} defaultValue={0} />
        </div>
      </div>
      <div className="room-form-field">
        <label htmlFor="inv-location">Location</label>
        <input id="inv-location" name="location" type="text" maxLength={80} placeholder="e.g. Store room A, Bar shelf" />
      </div>
      <div className="room-form-field">
        <label htmlFor="inv-notes">Notes</label>
        <input id="inv-notes" name="notes" type="text" maxLength={500} placeholder="Optional notes" />
      </div>
      {state.ok && state.message && <p className="form-success" role="status">{state.message}</p>}
      {!state.ok && state.message && <p className="field-error" role="alert">{state.message}</p>}
      <button className="room-form-submit" type="submit" disabled={pending}>{pending ? "Adding…" : "Add inventory item"}</button>
    </form>
  );
}

export type InventoryItemOption = { id: string; label: string };

export function AdjustStockForm({ items }: { items: InventoryItemOption[] }) {
  const [state, action, pending] = useActionState(adjustInventoryStock, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} className="room-form" action={action} noValidate>
      <div className="room-form-field">
        <label htmlFor="adj-item">Item *</label>
        <select id="adj-item" name="itemId" defaultValue="" required aria-invalid={state.errors?.itemId ? true : undefined}>
          <option value="" disabled>Select an item</option>
          {items.map((it) => (
            <option key={it.id} value={it.id}>{it.label}</option>
          ))}
        </select>
        <FieldError messages={state.errors?.itemId} />
      </div>
      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor="adj-type">Movement type *</label>
          <select id="adj-type" name="type" defaultValue="in" required>
            <option value="in">Stock in (received)</option>
            <option value="out">Stock out (used/issued)</option>
            <option value="adjust">Adjustment (correction, +/-)</option>
          </select>
        </div>
        <div className="room-form-field">
          <label htmlFor="adj-qty">Quantity *</label>
          <input id="adj-qty" name="quantity" type="number" step={1} placeholder="e.g. 10 or -2 for adjust" required aria-invalid={state.errors?.quantity ? true : undefined} />
          <FieldError messages={state.errors?.quantity} />
          <p className="room-form-hint">For in/out enter a positive number. For adjustment enter a positive or negative delta.</p>
        </div>
      </div>
      <div className="room-form-field">
        <label htmlFor="adj-reason">Reason / note</label>
        <input id="adj-reason" name="reason" type="text" maxLength={160} placeholder="e.g. Supplier delivery, housekeeping use, stock count correction" />
      </div>
      {state.ok && state.message && <p className="form-success" role="status">{state.message}</p>}
      {!state.ok && state.message && <p className="field-error" role="alert">{state.message}</p>}
      <button className="room-form-submit" type="submit" disabled={pending}>{pending ? "Saving…" : "Record movement"}</button>
    </form>
  );
}
