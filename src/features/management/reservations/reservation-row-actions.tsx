"use client";

import { useActionState, useState } from "react";
import { updateReservationStatus, type ReservationActionState } from "./reservation-actions";

const initial: ReservationActionState = { ok: true };

type Props = {
  reservationId: string;
  status: "reserved" | "checked_in" | "checked_out" | "cancelled";
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
  onResult?: (state: ReservationActionState) => void;
}) {
  const [state, action, pending] = useActionState(async (prev: ReservationActionState, fd: FormData) => {
    const res = await updateReservationStatus(prev, fd);
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

export function ReservationRowActions({ reservationId, status }: Props) {
  const [last, setLast] = useState<ReservationActionState | null>(null);
  const report = (s: ReservationActionState) => setLast(s);
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div className="row-actions">
        {status === "reserved" && (
          <>
            <ActionButton id={reservationId} status="checked_in" label="Check in" tone="primary" onResult={report} />
            <ActionButton id={reservationId} status="cancelled" label="Cancel" tone="danger" onResult={report} />
          </>
        )}
        {status === "checked_in" && (
          <ActionButton id={reservationId} status="checked_out" label="Check out" tone="primary" onResult={report} />
        )}
        {status === "checked_out" && (
          <ActionButton id={reservationId} status="reserved" label="Reopen" onResult={report} />
        )}
        {status === "cancelled" && (
          <ActionButton id={reservationId} status="reserved" label="Restore" onResult={report} />
        )}
      </div>
      {last && !last.ok && last.message && (
        <span className="field-error" role="alert" style={{ fontSize: 10 }}>{last.message}</span>
      )}
    </div>
  );
}
