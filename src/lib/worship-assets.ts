import fs from "node:fs";
import path from "node:path";

/**
 * Provisional public imagery. Drop the church's own files on top of these
 * paths, or add public/worship/logo.svg, and the pages pick them up.
 * Colours live in the theme tokens in src/app/globals.css.
 */
export const worshipImages = {
  hero: "/worship/hero.jpg",
  hands: "/worship/hands.jpg",
  room: "/worship/room.jpg",
} as const;

export function officialLogoSrc(): string | null {
  const file = path.join(process.cwd(), "public", "worship", "logo.svg");
  return fs.existsSync(file) ? "/worship/logo.svg" : null;
}
