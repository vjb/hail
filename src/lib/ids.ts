import { randomBytes } from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function randomToken(length: number): string {
  const bytes = randomBytes(length * 2);
  let out = "";
  for (let i = 0; i < bytes.length && out.length < length; i++) {
    // Rejection sampling keeps the distribution uniform over 62 symbols.
    if (bytes[i] < 248) out += ALPHABET[bytes[i] % 62];
  }
  return out.length === length ? out : out + randomToken(length - out.length);
}

export type IdPrefix = "usr" | "key" | "bty" | "top" | "wdr" | "clm" | "sub" | "apl" | "pay" | "ph";

export const newId = (prefix: IdPrefix) => `${prefix}_${randomToken(16)}`;
