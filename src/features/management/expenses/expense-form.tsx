"use client";

import { useActionState, useEffect, useRef } from "react";
import { createExpense, type ExpenseFormState } from "./expense-actions";

const initialState: ExpenseFormState = { ok: false };

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "mobile_money", label: "Mobile money" },
  { value: "bank_transfer", label: "Bank transfer" },
] as const;

const STATUSES = [
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
] as const;

const CATEGORY_SUGGESTIONS = [
  "Supplies",
  "Food & beverage",
  "Maintenance",
  "Utilities",
  "Housekeeping",
  "Staff",
  "Marketing",
  "Transport",
  "Equipment",
  "Other",
];

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return <p className="field-error" role="alert">{messages.join(" ")}</p>;
}

export function ExpenseForm() {
  const [state, action, pending] = useActionState(createExpense, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} className="room-form" action={action} noValidate>
      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor="expense-date">Date *</label>
          <input id="expense-date" name="expenseDate" type="date" required aria-invalid={state.errors?.expenseDate ? true : undefined} />
          <FieldError messages={state.errors?.expenseDate} />
        </div>
        <div className="room-form-field">
          <label htmlFor="expense-category">Category *</label>
          <input id="expense-category" name="category" type="text" maxLength={80} list="expense-category-suggestions" placeholder="e.g. Supplies" required aria-invalid={state.errors?.category ? true : undefined} />
          <datalist id="expense-category-suggestions">
            {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
          </datalist>
          <FieldError messages={state.errors?.category} />
        </div>
      </div>

      <div className="room-form-field">
        <label htmlFor="expense-description">Description *</label>
        <input id="expense-description" name="description" type="text" maxLength={500} placeholder="What was bought or paid for?" required aria-invalid={state.errors?.description ? true : undefined} />
        <FieldError messages={state.errors?.description} />
      </div>

      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor="expense-amount">Amount *</label>
          <input id="expense-amount" name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required aria-invalid={state.errors?.amount ? true : undefined} />
          <FieldError messages={state.errors?.amount} />
        </div>
        <div className="room-form-field">
          <label htmlFor="expense-currency">Currency</label>
          <input id="expense-currency" name="currency" type="text" maxLength={3} defaultValue="USD" aria-invalid={state.errors?.currency ? true : undefined} />
          <FieldError messages={state.errors?.currency} />
        </div>
      </div>

      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor="expense-method">Payment method</label>
          <select id="expense-method" name="method" defaultValue="cash">
            {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="room-form-field">
          <label htmlFor="expense-status">Status</label>
          <select id="expense-status" name="status" defaultValue="paid">
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor="expense-vendor">Vendor / payee</label>
          <input id="expense-vendor" name="vendor" type="text" maxLength={120} placeholder="Supplier or recipient" />
        </div>
        <div className="room-form-field">
          <label htmlFor="expense-reference">Reference / receipt</label>
          <input id="expense-reference" name="reference" type="text" maxLength={80} placeholder="Invoice or receipt no." />
        </div>
      </div>

      <div className="room-form-field">
        <label htmlFor="expense-notes">Notes</label>
        <input id="expense-notes" name="notes" type="text" maxLength={1000} placeholder="Optional notes" />
      </div>

      {state.ok && state.message && <p className="form-success" role="status">{state.message}</p>}
      {!state.ok && state.message && <p className="field-error" role="alert">{state.message}</p>}

      <button className="room-form-submit" type="submit" disabled={pending}>
        {pending ? "Recording expense…" : "Record expense"}
      </button>
      <p className="room-form-hint">Track buying, supplier payments, and operational expenses with status and reference.</p>
    </form>
  );
}
