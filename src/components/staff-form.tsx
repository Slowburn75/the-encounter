"use client";

import { useActionState } from "react";
import { buttonClass, inputClass, labelClass } from "@/components/styles";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/domain/permissions";
import { saveStaff, type StaffFormState } from "@/server/staff-actions";

export type StaffDefaults = {
  userId?: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "disabled";
  assignments: Record<string, { canExport: boolean; canEdit: boolean; canViewPrayer: boolean }>;
};

export function StaffForm({
  defaults,
  events,
}: {
  defaults?: StaffDefaults;
  events: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState<StaffFormState, FormData>(saveStaff, {});
  const role = defaults?.role ?? "registration_officer";
  return (
    <form action={action} className="space-y-5">
      {defaults?.userId ? <input type="hidden" name="userId" value={defaults.userId} /> : null}
      {state.message ? <p className="rounded-2xl bg-sand px-4 py-3 text-sm font-semibold text-clay">{state.message}</p> : null}
      <div>
        <label htmlFor="name" className={labelClass}>Name</label>
        <input id="name" name="name" required defaultValue={defaults?.name ?? ""} className={inputClass} />
      </div>
      <div>
        <label htmlFor="email" className={labelClass}>Email</label>
        <input id="email" name="email" type="email" required defaultValue={defaults?.email ?? ""} className={inputClass} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="role" className={labelClass}>Role</label>
          <select id="role" name="role" defaultValue={role} className={inputClass}>
            {ROLES.map((item) => (
              <option key={item} value={item}>{ROLE_LABELS[item]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className={labelClass}>Status</label>
          <select id="status" name="status" defaultValue={defaults?.status ?? "active"} className={inputClass}>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>{defaults ? "New password" : "Starting password"}</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required={!defaults} className={inputClass} />
        <p className="mt-1 text-sm text-muted">
          {defaults ? "Leave blank to keep the current password." : "At least 10 characters, with a letter and a number."}
        </p>
      </div>
      <fieldset className="space-y-3">
        <legend className={labelClass}>Program access</legend>
        <p className="text-sm text-muted">
          Super administrators already see every program. Prayer access stays off unless you tick it, and volunteers never receive it.
        </p>
        {events.map((event) => {
          const assignment = defaults?.assignments[event.id];
          return (
            <div key={event.id} className="rounded-2xl border border-line bg-card p-3">
              <input type="hidden" name="eventId" value={event.id} />
              <label className="flex gap-2 font-semibold">
                <input type="checkbox" name={`assign:${event.id}`} defaultChecked={Boolean(assignment)} />
                {event.title}
              </label>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <label className="flex gap-2"><input type="checkbox" name={`export:${event.id}`} defaultChecked={assignment?.canExport ?? false} />Export</label>
                <label className="flex gap-2"><input type="checkbox" name={`edit:${event.id}`} defaultChecked={assignment?.canEdit ?? true} />Correct records</label>
                <label className="flex gap-2"><input type="checkbox" name={`prayer:${event.id}`} defaultChecked={assignment?.canViewPrayer ?? false} />Read prayer requests</label>
              </div>
            </div>
          );
        })}
      </fieldset>
      <button className={buttonClass} disabled={pending}>{pending ? "Saving…" : "Save staff account"}</button>
    </form>
  );
}
