import sharp from "sharp";

// Perceptual fingerprint for proof photos (D-033): a 64-bit difference hash. Re-encoding, resizing or
// stamping a small new code on the same base photo changes only a few bits, so a photo reused across
// tasks lands within a few bits of the original. Not proof of anything alone: a reason for owner review.

/** Bits that may differ for two photos to count as the same picture. */
export const SAME_PHOTO_MAX_BITS = 10; // measured: stamped or re-encoded copies ≤ 6 bits, different scenes ≥ 21

const ZERO = BigInt(0);
const ONE = BigInt(1);

/** 64-bit dHash as a signed bigint (fits Postgres bigint). */
export async function photoHash(bytes: Buffer): Promise<bigint> {
  const { data } = await sharp(bytes).rotate().grayscale().resize(9, 8, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  let h = BigInt(0);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) h = (h << ONE) | (data[y * 9 + x] > data[y * 9 + x + 1] ? ONE : ZERO);
  return BigInt.asIntN(64, h);
}

export function hammingBits(a: bigint, b: bigint) {
  let x = BigInt.asUintN(64, a ^ b);
  let n = 0;
  while (x) {
    n += Number(x & ONE);
    x >>= ONE;
  }
  return n;
}
