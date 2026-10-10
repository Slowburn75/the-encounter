"use client";

import { useActionState } from "react";
import { buttonClass, inputClass, labelClass } from "@/components/styles";
import { login, type AuthFormState } from "@/server/auth-actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state.message ? <p className="rounded-2xl bg-sand px-4 py-3 text-sm font-semibold text-clay">{state.message}</p> : null}
      <div>
        <label htmlFor="email" className={labelClass}>Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </div>
      <button className={buttonClass} disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
