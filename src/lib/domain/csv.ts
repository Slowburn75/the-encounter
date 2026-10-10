import { WHATSAPP_SUSPENDED } from "@/lib/domain/constants";

const ALL_EXPORT_COLUMNS = [
  ["reference", "Registration reference"],
  ["fullName", "Full name"],
  ["phone", "Phone number"],
  ["email", "Email"],
  ["area", "Area of residence"],
  ["gender", "Gender"],
  ["ageRange", "Age range"],
  ["maritalStatus", "Marital status"],
  ["status", "Record status"],
  ["whatsappStatus", "WhatsApp confirmation"],
  ["duplicateFlag", "Possible duplicate phone"],
  ["registeredAt", "Registered at"],
  ["source", "Registration source"],
] as const;

export const EXPORT_COLUMNS = WHATSAPP_SUSPENDED
  ? ALL_EXPORT_COLUMNS.filter(([key]) => key !== "whatsappStatus")
  : ALL_EXPORT_COLUMNS;

export type ExportColumn = (typeof ALL_EXPORT_COLUMNS)[number][0];

export type ExportRow = Record<ExportColumn, string | number | boolean | null>;

/** Text for a spreadsheet cell. A leading apostrophe stops Excel treating the value as a formula. */
export function spreadsheetCell(value: string | number | boolean | null): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function csvCell(value: string | number | boolean | null): string {
  const text = spreadsheetCell(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(rows: ExportRow[]): string {
  const header = EXPORT_COLUMNS.map(([, label]) => csvCell(label)).join(",");
  const body = rows.map((row) =>
    EXPORT_COLUMNS.map(([key]) => csvCell(row[key])).join(","),
  );
  return `\uFEFF${[header, ...body].join("\r\n")}\r\n`;
}

export function exportIncludesPrayer(): boolean {
  return EXPORT_COLUMNS.some(([key, label]) =>
    /prayer/i.test(`${key} ${label}`),
  );
}
