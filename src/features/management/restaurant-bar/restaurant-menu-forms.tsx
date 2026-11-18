"use client";

import { useActionState, useEffect, useRef } from "react";
import { createMenuCategory, createMenuItem, type ActionState } from "./restaurant-actions";

const initial: ActionState = { ok: false };

type Category = { id: string; name: string };

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="field-error" role="alert">{messages.join(" ")}</p>;
}

export function CategoryForm() {
  const [state, action, pending] = useActionState(createMenuCategory, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state.ok]);
  return (
    <form ref={ref} className="room-form" action={action} noValidate>
      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor="cat-name">Category name *</label>
          <input id="cat-name" name="name" type="text" maxLength={80} placeholder="e.g. Drinks" required aria-invalid={state.errors?.name ? true : undefined} />
          <FieldError messages={state.errors?.name} />
        </div>
        <div className="room-form-field">
          <label htmlFor="cat-sort">Sort order</label>
          <input id="cat-sort" name="sortOrder" type="number" min={0} max={999} defaultValue={0} />
        </div>
      </div>
      {state.ok && state.message && <p className="form-success" role="status">{state.message}</p>}
      <button className="room-form-submit" type="submit" disabled={pending}>{pending ? "Adding…" : "Add category"}</button>
    </form>
  );
}

export function MenuItemForm({ categories }: { categories: Category[] }) {
  const [state, action, pending] = useActionState(createMenuItem, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state.ok]);
  return (
    <form ref={ref} className="room-form" action={action} noValidate>
      <div className="room-form-field">
        <label htmlFor="mi-name">Item name *</label>
        <input id="mi-name" name="name" type="text" maxLength={120} placeholder="e.g. Grilled chicken" required aria-invalid={state.errors?.name ? true : undefined} />
        <FieldError messages={state.errors?.name} />
      </div>
      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor="mi-category">Category</label>
          <select id="mi-category" name="categoryId" defaultValue="">
            <option value="">No category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="room-form-field">
          <label htmlFor="mi-price">Price (USD) *</label>
          <input id="mi-price" name="price" type="number" min={0} step="0.01" placeholder="0.00" required aria-invalid={state.errors?.price ? true : undefined} />
          <FieldError messages={state.errors?.price} />
        </div>
      </div>
      {state.ok && state.message && <p className="form-success" role="status">{state.message}</p>}
      {!state.ok && state.message && <p className="field-error" role="alert">{state.message}</p>}
      <button className="room-form-submit" type="submit" disabled={pending}>{pending ? "Adding…" : "Add menu item"}</button>
    </form>
  );
}
