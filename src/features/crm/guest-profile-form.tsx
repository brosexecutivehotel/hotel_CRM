"use client";

import { useActionState, useEffect } from "react";
import { updateGuest, type GuestFormState } from "./guest-actions";
import type { CrmGuestProfile } from "./crm-data-server";

const initialState: GuestFormState = { ok: false };

const SEGMENTS = [
  { value: "new", label: "New" },
  { value: "returning", label: "Returning" },
  { value: "vip", label: "VIP" },
  { value: "corporate", label: "Corporate" },
] as const;

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return <p className="field-error" role="alert">{messages.join(" ")}</p>;
}

export function GuestProfileForm({ guest }: { guest: CrmGuestProfile }) {
  const [state, action, pending] = useActionState(updateGuest, initialState);

  useEffect(() => {
    // reset handled by keying form in parent when guest changes
  }, [guest.id]);

  return (
    <form className="room-form" action={action} noValidate>
      <input type="hidden" name="id" value={guest.id} />

      <div className="room-form-field">
        <label htmlFor={`guest-name-${guest.id}`}>Guest name *</label>
        <input id={`guest-name-${guest.id}`} name="name" type="text" maxLength={120} defaultValue={guest.name} required aria-invalid={state.errors?.name ? true : undefined} />
        <FieldError messages={state.errors?.name} />
      </div>

      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor={`guest-email-${guest.id}`}>Email</label>
          <input id={`guest-email-${guest.id}`} name="email" type="email" maxLength={255} defaultValue={guest.emailRaw} placeholder="guest@example.com" aria-invalid={state.errors?.email ? true : undefined} />
          <FieldError messages={state.errors?.email} />
        </div>
        <div className="room-form-field">
          <label htmlFor={`guest-phone-${guest.id}`}>Phone</label>
          <input id={`guest-phone-${guest.id}`} name="phone" type="text" maxLength={30} defaultValue={guest.phoneRaw} placeholder="+211 ..." aria-invalid={state.errors?.phone ? true : undefined} />
          <FieldError messages={state.errors?.phone} />
        </div>
      </div>

      <div className="room-form-row">
        <div className="room-form-field">
          <label htmlFor={`guest-country-${guest.id}`}>Country</label>
          <input id={`guest-country-${guest.id}`} name="country" type="text" maxLength={80} defaultValue={guest.countryRaw} placeholder="e.g. South Sudan" aria-invalid={state.errors?.country ? true : undefined} />
          <FieldError messages={state.errors?.country} />
        </div>
        <div className="room-form-field">
          <label htmlFor={`guest-segment-${guest.id}`}>Segment *</label>
          <select id={`guest-segment-${guest.id}`} name="segment" defaultValue={guest.segment} aria-invalid={state.errors?.segment ? true : undefined}>
            {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <FieldError messages={state.errors?.segment} />
        </div>
      </div>

      <div className="room-form-field">
        <label htmlFor={`guest-notes-${guest.id}`}>Notes & preferences</label>
        <textarea
          id={`guest-notes-${guest.id}`}
          name="notes"
          maxLength={2000}
          defaultValue={guest.notesRaw}
          rows={4}
          placeholder="Preferences, special requests, important context..."
          style={{ width: "100%", padding: "10px 11px", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", background: "var(--surface)", color: "var(--ink)", font: "inherit", fontSize: 13, resize: "vertical" }}
          aria-invalid={state.errors?.notes ? true : undefined}
        />
        <FieldError messages={state.errors?.notes} />
      </div>

      {state.ok && state.message && <p className="form-success" role="status">{state.message}</p>}
      {!state.ok && state.message && <p className="field-error" role="alert">{state.message}</p>}

      <button className="room-form-submit" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save guest profile"}
      </button>
    </form>
  );
}
