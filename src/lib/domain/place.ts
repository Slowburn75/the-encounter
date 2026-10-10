/** Show a venue once. A repeated city name is not a street address. */
export function formatVenue(name: string, address?: string | null): string {
  const place = name.trim();
  const line = (address ?? "").trim();
  if (!line || line.toLowerCase() === place.toLowerCase()) return place;
  return `${place}, ${line}`;
}

/** True when the stored address is too thin to offer directions. */
export function venueNeedsDirections(name: string, address?: string | null): boolean {
  const place = name.trim();
  const line = (address ?? "").trim();
  if (!line || line.toLowerCase() === place.toLowerCase()) return true;
  return line.length < 12;
}
