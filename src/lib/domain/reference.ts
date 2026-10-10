const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function defaultRandom(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function createRegistrationReference(
  now = new Date(),
  random: (size: number) => Uint8Array = defaultRandom,
): string {
  const bytes = random(10);
  let code = "";
  for (const byte of bytes) {
    code += ALPHABET[byte % ALPHABET.length];
  }
  return `EW-${now.getUTCFullYear()}-${code}`;
}
