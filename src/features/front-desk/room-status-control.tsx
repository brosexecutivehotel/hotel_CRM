"use client";

import { useActionState } from "react";
import { updateRoomStatus, type SimpleState } from "@/features/management/rooms/room-actions";

const initial: SimpleState = { ok: true };

const statuses = [
  { value: "ready", label: "Ready" },
  { value: "cleaning", label: "Cleaning" },
  { value: "reserved", label: "Reserved" },
  { value: "occupied", label: "Occupied" },
  { value: "maintenance", label: "Maintenance" },
] as const;

export function RoomStatusControl({ roomId, current }: { roomId: string; current: string }) {
  const [state, action, pending] = useActionState(updateRoomStatus, initial);
  return (
    <form action={action} style={{ display: "grid", gap: 6, marginTop: 8 }}>
      <input type="hidden" name="roomId" value={roomId} />
      <label className="sr-only" htmlFor={`room-status-${roomId}`}>Room status</label>
      <select id={`room-status-${roomId}`} name="status" defaultValue={current} style={{ height: 30, fontSize: 11, padding: "0 8px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", width: "100%" }}>
        {statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <button type="submit" className="row-action" disabled={pending} style={{ width: "100%", justifyContent: "center" }}>
        {pending ? "Saving…" : "Update status"}
      </button>
      {!state.ok && state.message && <span className="field-error" role="alert" style={{ fontSize: 10 }}>{state.message}</span>}
    </form>
  );
}
