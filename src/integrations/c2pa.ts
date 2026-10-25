// Reads Content Credentials (C2PA) from an uploaded photo, before it's re-encoded (which strips them).
// Library: @contentauth/c2pa-node (docs checked 2026-10-24). Never required: most phones don't sign
// photos yet, and the in-page camera produces unsigned images. A signature from a generator that
// marks its output as AI-made is a reason to doubt the photo; a valid camera signature earns a badge.

import type { ContentCredentials } from "@/db/schema";
export type { ContentCredentials };

type Manifest = {
  claim_generator?: string;
  claim_generator_info?: Array<{ name?: string; version?: string }>;
  signature_info?: { issuer?: string; time?: string };
  assertions?: Array<{ label?: string; data?: { actions?: Array<{ action?: string; digitalSourceType?: string }> } }>;
};

const AI_SOURCE = /trainedAlgorithmicMedia|compositeWithTrainedAlgorithmicMedia|algorithmicMedia/i;

/** Returns null when the photo has no Content Credentials or they can't be read. Never throws. */
export async function readContentCredentials(bytes: Buffer, mimeType = "image/jpeg"): Promise<ContentCredentials | null> {
  try {
    const { Reader } = await import("@contentauth/c2pa-node");
    const reader = await Reader.fromAsset({ buffer: bytes, mimeType });
    if (!reader) return null;
    const active = reader.getActive() as Manifest | null | undefined;
    if (!active) return null;
    const store = reader.json() as { validation_state?: string; validation_status?: Array<{ code?: string }> };
    const actions = (active.assertions ?? []).filter((a) => a.label?.startsWith("c2pa.actions")).flatMap((a) => a.data?.actions ?? []);
    const generator = active.claim_generator ?? active.claim_generator_info?.map((g) => [g.name, g.version].filter(Boolean).join(" ")).join(", ") ?? null;
    return {
      issuer: active.signature_info?.issuer ?? null,
      generator: generator || null,
      signedAt: active.signature_info?.time ?? null,
      validation: store.validation_state ?? (store.validation_status?.length ? "Invalid" : "Valid"),
      aiGenerated: actions.some((a) => AI_SOURCE.test(a.digitalSourceType ?? "")),
    };
  } catch (e) {
    console.warn("[c2pa] couldn't read content credentials:", e instanceof Error ? e.message.slice(0, 200) : e);
    return null;
  }
}
