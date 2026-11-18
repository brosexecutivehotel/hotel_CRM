"use client";

import { useActionState, useState } from "react";
import { updatePaymentStatus, type PaymentActionState } from "./payment-actions";

const initial: PaymentActionState = { ok: true };

type Props = {
  paymentId: string;
  status: "pending" | "paid" | "refunded";
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
  onResult?: (state: PaymentActionState) => void;
}) {
  const [state, action, pending] = useActionState(async (prev: PaymentActionState, fd: FormData) => {
    const res = await updatePaymentStatus(prev, fd);
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

export function PaymentRowActions({ paymentId, status }: Props) {
  const [last, setLast] = useState<PaymentActionState | null>(null);
  const report = (s: PaymentActionState) => setLast(s);
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div className="row-actions">
        {status === "pending" && (
          <>
            <ActionButton id={paymentId} status="paid" label="Mark paid" tone="primary" onResult={report} />
            <ActionButton id={paymentId} status="refunded" label="Refund" tone="danger" onResult={report} />
          </>
        )}
        {status === "paid" && (
          <ActionButton id={paymentId} status="refunded" label="Refund" tone="danger" onResult={report} />
        )}
        {status === "refunded" && (
          <ActionButton id={paymentId} status="pending" label="Reopen" onResult={report} />
        )}
      </div>
      {last && !last.ok && last.message && (
        <span className="field-error" role="alert" style={{ fontSize: 10 }}>{last.message}</span>
      )}
    </div>
  );
}
