"use client";

import { useActionState } from "react";
import { createRoom, type RoomFormState } from "./room-actions";

const initialState: RoomFormState = { ok: false };

const ROOM_TYPES = [
  "Standard twin",
  "Standard king",
  "Deluxe twin",
  "Deluxe king",
  "Executive suite",
  "Family room",
  "Presidential suite",
];

const ROOM_STATUS_OPTIONS = [
  { value: "ready", label: "Ready" },
  { value: "cleaning", label: "Cleaning" },
  { value: "reserved", label: "Reserved" },
  { value: "occupied", label: "Occupied" },
  { value: "maintenance", label: "Maintenance" },
];

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return (
    <p className="field-error" role="alert">
      {messages.join(" ")}
    </p>
  );
}

export function RoomForm() {
  const [state, action, pending] = useActionState(createRoom, initialState);

  return (
    <form className="room-form" action={action} noValidate>
      <div className="room-form-field">
        <label htmlFor="room-number">Room number *</label>
        <input
          id="room-number"
          name="number"
          type="text"
          maxLength={10}
          placeholder="e.g. 302 or A-12"
          autoComplete="off"
          aria-invalid={state.errors?.number ? true : undefined}
          required
        />
        <FieldError messages={state.errors?.number} />
      </div>

      <div className="room-form-field">
        <label htmlFor="room-type">Room type *</label>
        <input
          id="room-type"
          name="type"
          type="text"
          list="room-type-options"
          maxLength={60}
          placeholder="e.g. Deluxe king"
          autoComplete="off"
          aria-invalid={state.errors?.type ? true : undefined}
          required
        />
        <datalist id="room-type-options">
          {ROOM_TYPES.map((type) => (
            <option key={type} value={type} />
          ))}
        </datalist>
        <FieldError messages={state.errors?.type} />
      </div>

      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor="room-floor">Floor</label>
          <input
            id="room-floor"
            name="floor"
            type="number"
            min={0}
            max={200}
            placeholder="e.g. 3"
            aria-invalid={state.errors?.floor ? true : undefined}
          />
          <FieldError messages={state.errors?.floor} />
        </div>

        <div className="room-form-field">
          <label htmlFor="room-status">Initial status</label>
          <select id="room-status" name="status" defaultValue="ready">
            {ROOM_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <FieldError messages={state.errors?.status} />
        </div>
      </div>

      {state.ok && state.message && (
        <p className="form-success" role="status">
          {state.message}
        </p>
      )}

      <button className="room-form-submit" type="submit" disabled={pending}>
        {pending ? "Adding room…" : "Add room"}
      </button>
      <p className="room-form-hint">
        Rooms are added to the property inventory and appear on the front desk room board once
        wired in. Fields marked * are required.
      </p>
    </form>
  );
}
