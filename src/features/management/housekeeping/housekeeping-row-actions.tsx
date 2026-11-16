"use client";

import { useActionState, useState } from "react";
import { updateHousekeepingTaskStatus, type HousekeepingActionState } from "./housekeeping-actions";

const initial: HousekeepingActionState = { ok: true };

type Props = {
  taskId: string;
  status: "pending" | "in_progress" | "done";
};

function ActionButton({
  id,
  status,
  label,
  tone = "default",
  onResult,
}: {
  id: string;
  status: Props["status"];
  label: string;
  tone?: "default" | "primary" | "danger";
  onResult?: (state: HousekeepingActionState) => void;
}) {
  const [state, action, pending] = useActionState(async (prev: HousekeepingActionState, fd: FormData) => {
    const res = await updateHousekeepingTaskStatus(prev, fd);
    onResult?.(res);
    return res;
  }, initial);
  const className =
    tone === "primary"
      ? "row-action row-action--primary"
      : tone === "danger"
        ? "row-action row-action--danger"
        : "row-action";
  return (
    <form action={action} style={{ display: "inline" }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={className} disabled={pending} title={!state.ok ? state.message : label}>
        {pending ? "…" : label}
      </button>
    </form>
  );
}

export function HousekeepingRowActions({ taskId, status }: Props) {
  const [last, setLast] = useState<HousekeepingActionState | null>(null);
  const report = (s: HousekeepingActionState) => setLast(s);
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div className="row-actions">
        {status === "pending" && (
          <ActionButton id={taskId} status="in_progress" label="Start" tone="primary" onResult={report} />
        )}
        {status === "in_progress" && (
          <ActionButton id={taskId} status="done" label="Mark done" tone="primary" onResult={report} />
        )}
        {status === "done" && (
          <ActionButton id={taskId} status="pending" label="Reopen" onResult={report} />
        )}
      </div>
      {last && !last.ok && last.message && (
        <span className="field-error" role="alert" style={{ fontSize: 10 }}>{last.message}</span>
      )}
    </div>
  );
}
