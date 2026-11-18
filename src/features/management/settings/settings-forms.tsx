"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  deleteStaffUser,
  inviteStaffUser,
  setUserActiveState,
  updateUserRole,
  type ActionState,
  type SimpleState,
} from "./settings-actions";

const inviteInitial: ActionState = { ok: false };
const simpleInitial: SimpleState = { ok: true };

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="field-error" role="alert">{messages.join(" ")}</p>;
}

export function InviteUserForm() {
  const [state, action, pending] = useActionState(inviteStaffUser, inviteInitial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} className="room-form" action={action} noValidate>
      <div className="room-form-field">
        <label htmlFor="inv-email">Email address *</label>
        <input id="inv-email" name="email" type="email" placeholder="staff@brosexecutive.com" required aria-invalid={state.errors?.email ? true : undefined} />
        <FieldError messages={state.errors?.email} />
      </div>
      <div className="room-form-field">
        <label htmlFor="inv-role">Dashboard role *</label>
        <select id="inv-role" name="role" defaultValue="front_desk" required>
          <option value="management">Management</option>
          <option value="front_desk">Front desk</option>
          <option value="crm">CRM</option>
        </select>
        <FieldError messages={state.errors?.role} />
      </div>
      {state.ok && state.message && <p className="form-success" role="status">{state.message}</p>}
      {!state.ok && state.message && <p className="field-error" role="alert">{state.message}</p>}
      <button className="room-form-submit" type="submit" disabled={pending}>{pending ? "Sending invite…" : "Send invitation"}</button>
      <p className="room-form-hint">Invites are sent via Clerk. After the user signs up, assign/confirm their role here if they land on Access pending.</p>
    </form>
  );
}

export function UserRoleForm({ userId, currentRole }: { userId: string; currentRole: string }) {
  const [state, action, pending] = useActionState(updateUserRole, simpleInitial);
  return (
    <form action={action} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <input type="hidden" name="userId" value={userId} />
      <select name="role" defaultValue={currentRole} aria-label="User role" style={{ minWidth: 140 }}>
        <option value="management">Management</option>
        <option value="front_desk">Front desk</option>
        <option value="crm">CRM</option>
        <option value="none">No access</option>
      </select>
      <button type="submit" className="row-action row-action--primary" disabled={pending} title={!state.ok ? state.message : undefined}>
        {pending ? "…" : "Save role"}
      </button>
      {!state.ok && state.message && <span className="field-error" role="alert" style={{ fontSize: 11 }}>{state.message}</span>}
    </form>
  );
}

function ToggleActiveButton({
  userId,
  banned,
  isSelf,
  onResult,
}: {
  userId: string;
  banned: boolean;
  isSelf: boolean;
  onResult: (s: SimpleState) => void;
}) {
  const [, action, pending] = useActionState(async (prev: SimpleState, fd: FormData) => {
    const res = await setUserActiveState(prev, fd);
    onResult(res);
    return res;
  }, simpleInitial);
  return (
    <form action={action} style={{ display: "inline" }}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="active" value={banned ? "true" : "false"} />
      <button
        type="submit"
        className="row-action"
        disabled={pending || (!banned && isSelf)}
        title={!banned && isSelf ? "You cannot deactivate yourself" : banned ? "Reactivate user" : "Deactivate user"}
      >
        {pending ? "…" : banned ? "Reactivate" : "Deactivate"}
      </button>
    </form>
  );
}

function DeleteUserButton({
  userId,
  isSelf,
  onResult,
}: {
  userId: string;
  isSelf: boolean;
  onResult: (s: SimpleState) => void;
}) {
  const [, action, pending] = useActionState(async (prev: SimpleState, fd: FormData) => {
    if (typeof window !== "undefined" && !window.confirm("Delete this user permanently? This cannot be undone.")) {
      return prev;
    }
    const res = await deleteStaffUser(prev, fd);
    onResult(res);
    return res;
  }, simpleInitial);
  return (
    <form action={action} style={{ display: "inline" }}>
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" className="row-action row-action--danger" disabled={pending || isSelf} title={isSelf ? "You cannot delete yourself" : "Delete user"}>
        {pending ? "…" : "Delete"}
      </button>
    </form>
  );
}

export function UserStatusActions({ userId, banned, isSelf }: { userId: string; banned: boolean; isSelf: boolean }) {
  const [last, setLast] = useState<SimpleState | null>(null);
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div className="row-actions">
        <ToggleActiveButton userId={userId} banned={banned} isSelf={isSelf} onResult={setLast} />
        <DeleteUserButton userId={userId} isSelf={isSelf} onResult={setLast} />
      </div>
      {last && !last.ok && last.message && <span className="field-error" role="alert" style={{ fontSize: 10 }}>{last.message}</span>}
      {last && last.ok && last.message && <span className="form-success" role="status" style={{ fontSize: 10 }}>{last.message}</span>}
    </div>
  );
}
