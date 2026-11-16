"use client";

import { useActionState, useEffect, useRef } from "react";
import { createHousekeepingTask, type HousekeepingFormState } from "./housekeeping-actions";

type RoomOption = { id: string; number: string; type: string };

const initialState: HousekeepingFormState = { ok: false };

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
] as const;

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return <p className="field-error" role="alert">{messages.join(" ")}</p>;
}

export function HousekeepingForm({ rooms }: { rooms: RoomOption[] }) {
  const [state, action, pending] = useActionState(createHousekeepingTask, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} className="room-form" action={action} noValidate>
      <div className="room-form-field">
        <label htmlFor="hk-room">Room *</label>
        <select id="hk-room" name="roomId" defaultValue="" required aria-invalid={state.errors?.roomId ? true : undefined}>
          <option value="" disabled>Select a room</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>Room {r.number} — {r.type}</option>
          ))}
        </select>
        <FieldError messages={state.errors?.roomId} />
      </div>

      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor="hk-assigned">Assigned to</label>
          <input id="hk-assigned" name="assignedTo" type="text" maxLength={120} placeholder="e.g. Mary A." />
          <FieldError messages={state.errors?.assignedTo} />
        </div>
        <div className="room-form-field">
          <label htmlFor="hk-status">Status</label>
          <select id="hk-status" name="status" defaultValue="pending">
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <FieldError messages={state.errors?.status} />
        </div>
      </div>

      {state.ok && state.message && <p className="form-success" role="status">{state.message}</p>}
      {!state.ok && state.message && <p className="field-error" role="alert">{state.message}</p>}

      <button className="room-form-submit" type="submit" disabled={pending}>
        {pending ? "Creating task…" : "Create task"}
      </button>
      <p className="room-form-hint">Creating or progressing tasks updates the room’s housekeeping status (cleaning/ready) accordingly.</p>
    </form>
  );
}
