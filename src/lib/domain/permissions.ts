export const ROLES = [
  "super_admin",
  "event_admin",
  "registration_officer",
  "volunteer",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super administrator",
  event_admin: "Event administrator",
  registration_officer: "Registration officer",
  volunteer: "Volunteer",
};

export const PERMISSIONS = [
  "events.create",
  "events.update",
  "events.publish",
  "events.close",
  "events.complete",
  "events.cancel",
  "events.archive",
  "events.delete_draft",
  "staff.manage",
  "registrations.view",
  "registrations.view_sensitive",
  "registrations.update",
  "registrations.export",
  "registrations.view_prayer",
  "registrations.anonymize",
  "stats.view",
  "whatsapp.retry",
  "settings.manage",
  "audit.view",
  "audit.view_event",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type Assignment = {
  eventId: string;
  canExport: boolean;
  canEdit: boolean;
  canViewPrayer: boolean;
};

export type Actor = {
  id: string;
  name: string;
  role: Role;
  status: "active" | "disabled";
  assignments: Assignment[];
};

const EVENT_SCOPED = new Set<Permission>([
  "events.update",
  "events.publish",
  "events.close",
  "events.complete",
  "events.cancel",
  "events.delete_draft",
  "registrations.view",
  "registrations.view_sensitive",
  "registrations.update",
  "registrations.export",
  "registrations.view_prayer",
  "stats.view",
  "whatsapp.retry",
  "audit.view_event",
]);

const ROLE_DEFAULTS: Record<Role, ReadonlySet<Permission>> = {
  super_admin: new Set(PERMISSIONS),
  event_admin: new Set<Permission>([
    "events.create",
    "events.update",
    "events.publish",
    "events.close",
    "events.complete",
    "events.cancel",
    "events.delete_draft",
    "registrations.view",
    "registrations.view_sensitive",
    "registrations.update",
    "registrations.export",
    "stats.view",
    "whatsapp.retry",
    "audit.view_event",
  ]),
  registration_officer: new Set<Permission>([
    "registrations.view",
    "registrations.view_sensitive",
    "registrations.update",
  ]),
  volunteer: new Set<Permission>(["registrations.view"]),
};

export function hasPermission(
  actor: Actor,
  permission: Permission,
  eventId?: string,
): boolean {
  if (actor.status !== "active") return false;
  if (actor.role === "super_admin") return true;
  if (actor.role === "volunteer" && permission !== "registrations.view") {
    return false;
  }

  const allowedByRole =
    ROLE_DEFAULTS[actor.role].has(permission) ||
    (permission === "registrations.view_prayer" &&
      (actor.role === "event_admin" ||
        actor.role === "registration_officer")) ||
    (permission === "registrations.export" &&
      actor.role === "registration_officer");

  if (!allowedByRole) return false;
  if (!EVENT_SCOPED.has(permission)) return true;
  if (!eventId) return false;

  const assignment = actor.assignments.find((item) => item.eventId === eventId);
  if (!assignment) return false;
  if (permission === "registrations.view_prayer") return assignment.canViewPrayer;
  if (
    permission === "registrations.export" &&
    actor.role === "registration_officer"
  ) {
    return assignment.canExport;
  }
  if (
    permission === "registrations.update" &&
    actor.role === "registration_officer"
  ) {
    return assignment.canEdit;
  }
  return true;
}

export function canAccessEvent(actor: Actor, eventId: string): boolean {
  if (actor.status !== "active") return false;
  if (actor.role === "super_admin") return true;
  return actor.assignments.some((item) => item.eventId === eventId);
}

export function permissionDenial(
  actor: Actor | null,
  permission: Permission,
  eventId?: string,
): string | null {
  if (!actor) return "You need to sign in.";
  if (!hasPermission(actor, permission, eventId)) {
    return "You do not have permission to do that.";
  }
  return null;
}
