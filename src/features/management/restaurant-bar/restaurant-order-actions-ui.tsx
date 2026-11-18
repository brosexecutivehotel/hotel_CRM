"use client";

import { useActionState, useState } from "react";
import { updateOrderStatus, type SimpleState } from "./restaurant-actions";

const initial: SimpleState = { ok: true };

type Status = "open" | "served" | "paid" | "cancelled";

function StatusButton({
  orderId,
  to,
  label,
  tone = "default",
  onResult,
}: {
  orderId: string;
  to: Status;
  label: string;
  tone?: "default" | "primary" | "danger";
  onResult: (s: SimpleState) => void;
}) {
  const [state, action, pending] = useActionState(async (prev: SimpleState, fd: FormData) => {
    const res = await updateOrderStatus(prev, fd);
    onResult(res);
    return res;
  }, initial);
  const className = tone === "primary" ? "row-action row-action--primary" : tone === "danger" ? "row-action row-action--danger" : "row-action";
  return (
    <form action={action} style={{ display: "inline" }}>
      <input type="hidden" name="id" value={orderId} />
      <input type="hidden" name="status" value={to} />
      <button type="submit" className={className} disabled={pending} title={!state.ok ? state.message : label}>{pending ? "…" : label}</button>
    </form>
  );
}

export function OrderStatusActions({ orderId, status }: { orderId: string; status: Status }) {
  const [last, setLast] = useState<SimpleState | null>(null);
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div className="row-actions">
        {status === "open" && (<><StatusButton orderId={orderId} to="served" label="Mark served" tone="primary" onResult={setLast} /><StatusButton orderId={orderId} to="paid" label="Mark paid" onResult={setLast} /><StatusButton orderId={orderId} to="cancelled" label="Cancel" tone="danger" onResult={setLast} /></>)}
        {status === "served" && (<><StatusButton orderId={orderId} to="paid" label="Mark paid" tone="primary" onResult={setLast} /><StatusButton orderId={orderId} to="open" label="Reopen" onResult={setLast} /></>)}
        {status === "paid" && <StatusButton orderId={orderId} to="open" label="Reopen" onResult={setLast} />}
        {status === "cancelled" && <StatusButton orderId={orderId} to="open" label="Reopen" onResult={setLast} />}
      </div>
      {last && !last.ok && last.message && <span className="field-error" role="alert" style={{ fontSize: 10 }}>{last.message}</span>}
    </div>
  );
}
