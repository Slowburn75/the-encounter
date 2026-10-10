import { LAGOS_UTC_OFFSET, TIME_ZONE } from "@/lib/domain/constants";

const LOCAL_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function lagosLocalToUtc(value: string): Date | null {
  const match = LOCAL_PATTERN.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "00"] = match;
  const date = new Date(
    `${year}-${month}-${day}T${hour}:${minute}:${second}${LAGOS_UTC_OFFSET}`,
  );
  if (Number.isNaN(date.getTime())) return null;
  const parts = lagosParts(date);
  if (
    parts.year !== year ||
    parts.month !== month ||
    parts.day !== day ||
    parts.hour !== hour ||
    parts.minute !== minute
  ) {
    return null;
  }
  return date;
}

export function utcToLagosInput(date: Date): string {
  const parts = lagosParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function formatLagos(date: Date, withTime = true): string {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

export function formatLagosShort(date: Date): string {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function lagosParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}
