"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addMaintenanceLog, updateMaintenanceStatus, type ActionState, type SimpleState } from "./maintenance-actions";

const initialSimple: SimpleState = { ok: true };
const initialAction: ActionState = { ok: false };

type Status = "open" | "in_progress" | "resolved" | "cancelled";

function StatusButton({
  id,
  to,
  label,
  tone = "default",
  onResult,
}: {
  id: string;
  to: Status;
  label: string;
  tone?: "default" | "primary" | "danger";
  onResult: (s: SimpleState) => void;
}) {
  const [state, action, pending] = useActionState(async (prev: SimpleState, fd: FormData) => {
    const res = await updateMaintenanceStatus(prev, fd);
    onResult(res);
    return res;
  }, initialSimple);
  const className =
    tone === "primary" ? "row-action row-action--primary" : tone === "danger" ? "row-action row-action--danger" : "row-action";
  return (
    <form action={action} style={{ display: "inline" }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={to} />
      <button type="submit" className={className} disabled={pending} title={!state.ok ? state.message : label}>
        {pending ? "…" : label}
      </button>
    </form>
  );
}

export function MaintenanceRowActions({ workOrderId, status }: { workOrderId: string; status: Status }) {
  const [last, setLast] = useState<SimpleState | null>(null);
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div className="row-actions">
        {status === "open" && (
          <>
            <StatusButton id={workOrderId} to="in_progress" label="Start" tone="primary" onResult={setLast} />
            <StatusButton id={workOrderId} to="resolved" label="Resolve" onResult={setLast} />
            <StatusButton id={workOrderId} to="cancelled" label="Cancel" tone="danger" onResult={setLast} />
          </>
        )}
        {status === "in_progress" && (
          <>
            <StatusButton id={workOrderId} to="resolved" label="Resolve" tone="primary" onResult={setLast} />
            <StatusButton id={workOrderId} to="open" label="Reopen" onResult={setLast} />
          </>
        )}
        {(status === "resolved" || status === "cancelled") && (
          <StatusButton id={workOrderId} to="open" label="Reopen" onResult={setLast} />
        )}
      </div>
      {last && !last.ok && last.message && <span className="field-error" role="alert" style={{ fontSize: 10 }}>{last.message}</span>}
    </div>
  );
}

export function AddMaintenanceLogForm({ workOrderId }: { workOrderId: string }) {
  const [state, action, pending] = useActionState(addMaintenanceLog, initialAction);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} style={{ display: "grid", gap: 6, marginTop: 8 }}>
      <input type="hidden" name="workOrderId" value={workOrderId} />
      <label className="sr-only" htmlFor={`log-${workOrderId}`}>Add log note</label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-start" }}>
        <input
          id={`log-${workOrderId}`}
          name="note"
          type="text"
          maxLength={1000}
          placeholder="Add log note / update…"
          style={{ flex: "1 1 180px", minWidth: 0 }}
          aria-invalid={state.errors?.note ? true : undefined}
        />
        <button type="submit" className="row-action" disabled={pending}>{pending ? "…" : "Add note"}</button>
      </div>
      {state.errors?.note && <p className="field-error" role="alert">{state.errors.note.join(" ")}</p>}
      {state.ok && state.message && <p className="form-success" role="status" style={{ margin: 0 }}>{state.message}</p>}
      {!state.ok && state.message && <p className="field-error" role="alert" style={{ margin: 0 }}>{state.message}</p>}
    </form>
  );
}
