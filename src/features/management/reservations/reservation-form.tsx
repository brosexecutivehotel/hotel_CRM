"use client";

import { useActionState, useEffect, useRef } from "react";
import { createReservation, type ReservationFormState } from "./reservation-actions";

type RoomOption = { id: string; number: string; type: string };

const initialState: ReservationFormState = { ok: false };

const STATUSES = [
  { value: "reserved", label: "Reserved" },
  { value: "checked_in", label: "Checked in" },
  { value: "checked_out", label: "Checked out" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const SOURCES = [
  { value: "direct", label: "Direct" },
  { value: "booking_com", label: "Booking.com" },
  { value: "corporate", label: "Corporate" },
  { value: "walk_in", label: "Walk-in" },
  { value: "phone", label: "Phone" },
] as const;

const SEGMENTS = [
  { value: "new", label: "New" },
  { value: "returning", label: "Returning" },
  { value: "vip", label: "VIP" },
  { value: "corporate", label: "Corporate" },
] as const;

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return <p className="field-error" role="alert">{messages.join(" ")}</p>;
}

export function ReservationForm({ rooms }: { rooms: RoomOption[] }) {
  const [state, action, pending] = useActionState(createReservation, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} className="room-form" action={action} noValidate>
      <div className="room-form-field">
        <label htmlFor="guestName">Guest name *</label>
        <input id="guestName" name="guestName" type="text" maxLength={120} placeholder="Full name" required aria-invalid={state.errors?.guestName ? true : undefined} />
        <FieldError messages={state.errors?.guestName} />
      </div>

      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor="guestEmail">Email</label>
          <input id="guestEmail" name="guestEmail" type="email" maxLength={255} placeholder="guest@example.com" aria-invalid={state.errors?.guestEmail ? true : undefined} />
          <FieldError messages={state.errors?.guestEmail} />
        </div>
        <div className="room-form-field">
          <label htmlFor="guestPhone">Phone</label>
          <input id="guestPhone" name="guestPhone" type="text" maxLength={30} placeholder="+211..." />
          <FieldError messages={state.errors?.guestPhone} />
        </div>
      </div>

      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor="guestCountry">Country</label>
          <input id="guestCountry" name="guestCountry" type="text" maxLength={80} placeholder="e.g. South Sudan" />
        </div>
        <div className="room-form-field">
          <label htmlFor="guestSegment">Guest segment</label>
          <select id="guestSegment" name="guestSegment" defaultValue="new">
            {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="room-form-field">
        <label htmlFor="roomId">Room *</label>
        <select id="roomId" name="roomId" defaultValue="" required aria-invalid={state.errors?.roomId ? true : undefined}>
          <option value="" disabled>Select a room</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>Room {r.number} — {r.type}</option>
          ))}
        </select>
        <FieldError messages={state.errors?.roomId} />
      </div>

      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor="checkIn">Check-in *</label>
          <input id="checkIn" name="checkIn" type="date" required aria-invalid={state.errors?.checkIn ? true : undefined} />
          <FieldError messages={state.errors?.checkIn} />
        </div>
        <div className="room-form-field">
          <label htmlFor="checkOut">Check-out *</label>
          <input id="checkOut" name="checkOut" type="date" required aria-invalid={state.errors?.checkOut ? true : undefined} />
          <FieldError messages={state.errors?.checkOut} />
        </div>
      </div>

      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue="reserved">
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="room-form-field">
          <label htmlFor="source">Source</label>
          <select id="source" name="source" defaultValue="direct">
            {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {state.ok && state.message && <p className="form-success" role="status">{state.message}</p>}
      {!state.ok && state.message && <p className="field-error" role="alert">{state.message}</p>}

      <button className="room-form-submit" type="submit" disabled={pending}>
        {pending ? "Creating reservation…" : "Create reservation"}
      </button>
      <p className="room-form-hint">Creates a guest record and reservation. Room availability is checked for overlapping active dates. Actions update room status when checking in/out.</p>
    </form>
  );
}
