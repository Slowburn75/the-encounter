"use client";

import { useActionState } from "react";
import { buttonClass, inputClass, labelClass } from "@/components/styles";
import { changePassword, type AuthFormState } from "@/server/auth-actions";

export function AccountForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(changePassword, {});
  return (
    <form action={action} className="max-w-md space-y-4">
      {state.message ? <p className="rounded-2xl bg-sand px-4 py-3 text-sm font-semibold text-clay">{state.message}</p> : null}
      <div>
        <label htmlFor="currentPassword" className={labelClass}>Current password</label>
        <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="newPassword" className={labelClass}>New password</label>
        <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required className={inputClass} />
        <p className="mt-1 text-sm text-muted">At least 10 characters, with a letter and a number.</p>
      </div>
      <button className={buttonClass} disabled={pending}>{pending ? "Updating…" : "Update password"}</button>
    </form>
  );
}
