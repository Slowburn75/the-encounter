import type { ClosedReason } from "@/lib/domain/registration-window";
import { formatLagos } from "@/lib/domain/time";

export function registrationClosedMessage(
  reason: ClosedReason,
  opensAt?: Date | null,
): string {
  switch (reason) {
    case "not_open_yet":
      return opensAt
        ? `Registration opens on ${formatLagos(opensAt)}.`
        : "Registration is not open yet.";
    case "registration_closed":
    case "window_elapsed":
      return "Registration is closed.";
    case "completed":
      return "This program has ended. Registration is closed.";
    case "cancelled":
      return "This program has been cancelled. Registration is closed.";
    case "full":
      return "Registration is full. No further registrations can be accepted.";
    case "draft":
    case "archived":
      return "Registration is not available.";
    default:
      return "Registration is not available.";
  }
}

export function whatsAppStatusLabel(status: string | null): string {
  switch (status) {
    case "delivered":
      return "Delivered";
    case "sent":
      return "Sent";
    case "failed":
      return "Failed";
    case "pending_provider":
      return "Waiting for WhatsApp setup";
    case "queued":
    case "sending":
      return "Pending";
    default:
      return "Not requested";
  }
}
