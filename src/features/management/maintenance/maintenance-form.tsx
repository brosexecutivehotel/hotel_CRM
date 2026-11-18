"use client";

import { useActionState, useEffect, useRef } from "react";
import { createMaintenanceWorkOrder, type ActionState } from "./maintenance-actions";

const initial: ActionState = { ok: false };

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="field-error" role="alert">{messages.join(" ")}</p>;
}

export type RoomOption = { id: string; label: string };

export function MaintenanceForm({ rooms }: { rooms: RoomOption[] }) {
  const [state, action, pending] = useActionState(createMaintenanceWorkOrder, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} className="room-form" action={action} noValidate>
      <div className="room-form-field">
        <label htmlFor="mnt-room">Room (optional if area specified)</label>
        <select id="mnt-room" name="roomId" defaultValue="">
          <option value="">No specific room</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <FieldError messages={state.errors?.roomId} />
      </div>
      <div className="room-form-field">
        <label htmlFor="mnt-area">Area / location</label>
        <input id="mnt-area" name="area" type="text" maxLength={120} placeholder="e.g. Lobby, Kitchen, Pool area" aria-invalid={state.errors?.area ? true : undefined} />
        <FieldError messages={state.errors?.area} />
      </div>
      <div className="room-form-field">
        <label htmlFor="mnt-title">Issue / title *</label>
        <input id="mnt-title" name="title" type="text" maxLength={160} placeholder="e.g. AC not cooling, leaking faucet" required aria-invalid={state.errors?.title ? true : undefined} />
        <FieldError messages={state.errors?.title} />
      </div>
      <div className="room-form-field">
        <label htmlFor="mnt-desc">Description / notes</label>
        <textarea id="mnt-desc" name="description" maxLength={2000} rows={3} placeholder="Details, symptoms, access notes…" />
      </div>
      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor="mnt-priority">Priority *</label>
          <select id="mnt-priority" name="priority" defaultValue="medium" required>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="room-form-field">
          <label htmlFor="mnt-assigned">Assigned to</label>
          <input id="mnt-assigned" name="assignedTo" type="text" maxLength={120} placeholder="Technician or staff name" />
        </div>
      </div>
      <div className="room-form-field">
        <label htmlFor="mnt-reported">Reported by</label>
        <input id="mnt-reported" name="reportedBy" type="text" maxLength={120} placeholder="Guest, staff, or source" />
      </div>
      {state.ok && state.message && <p className="form-success" role="status">{state.message}</p>}
      {!state.ok && state.message && <p className="field-error" role="alert">{state.message}</p>}
      <button className="room-form-submit" type="submit" disabled={pending}>{pending ? "Creating…" : "Create work order"}</button>
    </form>
  );
}
