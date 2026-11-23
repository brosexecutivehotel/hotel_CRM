"use client";

import { useActionState, useState } from "react";
import { updateExpenseStatus, type ExpenseActionState } from "./expense-actions";

const initial: ExpenseActionState = { ok: true };

type Props = {
  expenseId: string;
  status: "pending" | "paid";
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
  tone?: "default" | "primary";
  onResult?: (state: ExpenseActionState) => void;
}) {
  const [state, action, pending] = useActionState(async (prev: ExpenseActionState, fd: FormData) => {
    const res = await updateExpenseStatus(prev, fd);
    onResult?.(res);
    return res;
  }, initial);
  const className = tone === "primary" ? "row-action row-action--primary" : "row-action";
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

export function ExpenseRowActions({ expenseId, status }: Props) {
  const [last, setLast] = useState<ExpenseActionState | null>(null);
  const report = (s: ExpenseActionState) => setLast(s);
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div className="row-actions">
        {status === "pending" ? (
          <ActionButton id={expenseId} status="paid" label="Mark paid" tone="primary" onResult={report} />
        ) : (
          <ActionButton id={expenseId} status="pending" label="Mark pending" onResult={report} />
        )}
      </div>
      {last && !last.ok && last.message && (
        <span className="field-error" role="alert" style={{ fontSize: 10 }}>{last.message}</span>
      )}
    </div>
  );
}
