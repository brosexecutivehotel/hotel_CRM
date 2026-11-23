"use client";

import { useActionState, useEffect, useRef } from "react";
import { createPayment, type PaymentFormState } from "./payment-actions";

type ReservationOption = { id: string; label: string };

const initialState: PaymentFormState = { ok: false };

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "mobile_money", label: "Mobile money" },
  { value: "bank_transfer", label: "Bank transfer" },
] as const;

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
] as const;

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return <p className="field-error" role="alert">{messages.join(" ")}</p>;
}

export function PaymentForm({
  reservations,
  defaultReservationId,
  onSuccess,
}: {
  reservations: ReservationOption[];
  defaultReservationId?: string;
  onSuccess?: () => void;
}) {
  const [state, action, pending] = useActionState(createPayment, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onSuccess?.();
    }
  }, [state.ok, onSuccess]);

  return (
    <form ref={formRef} className="room-form" action={action} noValidate>
      <div className="room-form-field">
        <label htmlFor="pay-reservation">Reservation *</label>
        <select id="pay-reservation" name="reservationId" defaultValue={defaultReservationId ?? ""} required aria-invalid={state.errors?.reservationId ? true : undefined}>
          <option value="" disabled>Select a reservation</option>
          {reservations.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
        <FieldError messages={state.errors?.reservationId} />
      </div>

      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor="pay-amount">Amount *</label>
          <input id="pay-amount" name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required aria-invalid={state.errors?.amount ? true : undefined} />
          <FieldError messages={state.errors?.amount} />
        </div>
        <div className="room-form-field">
          <label htmlFor="pay-currency">Currency</label>
          <input id="pay-currency" name="currency" type="text" maxLength={3} defaultValue="USD" placeholder="USD" aria-invalid={state.errors?.currency ? true : undefined} />
          <FieldError messages={state.errors?.currency} />
        </div>
      </div>

      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor="pay-method">Method</label>
          <select id="pay-method" name="method" defaultValue="cash">
            {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="room-form-field">
          <label htmlFor="pay-status">Status</label>
          <select id="pay-status" name="status" defaultValue="pending">
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {state.ok && state.message && <p className="form-success" role="status">{state.message}</p>}
      {!state.ok && state.message && <p className="field-error" role="alert">{state.message}</p>}

      <button className="room-form-submit" type="submit" disabled={pending}>
        {pending ? "Recording payment…" : "Record payment"}
      </button>
      <p className="room-form-hint">Payments are linked to reservations. Mark as paid to record revenue and set the paid time.</p>
    </form>
  );
}
