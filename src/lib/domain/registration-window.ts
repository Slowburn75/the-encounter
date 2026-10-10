import type { EventStatus } from "@/lib/domain/constants";

export type EventGate = {
  status: EventStatus;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  capacity: number | null;
};

export type ClosedReason =
  | "draft"
  | "not_open_yet"
  | "registration_closed"
  | "window_elapsed"
  | "completed"
  | "cancelled"
  | "archived"
  | "full";

export function registrationAvailability(
  event: EventGate,
  now: Date,
  acceptedCount: number,
): { open: true } | { open: false; reason: ClosedReason } {
  switch (event.status) {
    case "draft":
      return { open: false, reason: "draft" };
    case "cancelled":
      return { open: false, reason: "cancelled" };
    case "completed":
      return { open: false, reason: "completed" };
    case "archived":
      return { open: false, reason: "archived" };
    case "registration_closed":
      return { open: false, reason: "registration_closed" };
    case "published":
      break;
    default:
      return { open: false, reason: "registration_closed" };
  }

  if (event.registrationOpensAt && now < event.registrationOpensAt) {
    return { open: false, reason: "not_open_yet" };
  }
  if (event.registrationClosesAt && now > event.registrationClosesAt) {
    return { open: false, reason: "window_elapsed" };
  }
  if (event.capacity !== null && acceptedCount >= event.capacity) {
    return { open: false, reason: "full" };
  }
  return { open: true };
}

export function isPublicEventStatus(status: EventStatus): boolean {
  return (
    status === "published" ||
    status === "registration_closed" ||
    status === "completed" ||
    status === "cancelled"
  );
}

export function isSlugLocked(status: EventStatus): boolean {
  return status !== "draft";
}

const TRANSITIONS: Record<EventStatus, readonly EventStatus[]> = {
  draft: ["published", "cancelled"],
  published: ["registration_closed", "completed", "cancelled"],
  registration_closed: ["published", "completed", "cancelled"],
  completed: ["archived"],
  cancelled: ["archived", "draft"],
  archived: [],
};

export function canTransition(from: EventStatus, to: EventStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextStatuses(from: EventStatus): readonly EventStatus[] {
  return TRANSITIONS[from];
}
