import type { BountyProduct } from "@/db/schema";

// Channel3 product search (shape checked against a live response on 2026-10-24):
// POST /v1/search { query, limit } → { products: [{ title, brands[{name}], images[{url,is_main_image}],
//   offers[{ domain, price{price,currency}, availability }], key_features[], structured_attributes{} }] }

type C3Product = {
  id: string;
  title: string;
  brands?: Array<{ name: string }>;
  images?: Array<{ url: string; is_main_image?: boolean; alt_text?: string }>;
  offers?: Array<{ domain?: string; price?: { price?: number; currency?: string }; availability?: string }>;
  key_features?: string[];
  structured_attributes?: Record<string, string[]>;
};

type Fetch = typeof fetch;
let fetchImpl: Fetch = (...a) => fetch(...a);
export const setChannel3Fetch = (f: Fetch) => (fetchImpl = f);

export function toBountyProduct(p: C3Product): BountyProduct {
  const img = p.images?.find((i) => i.is_main_image) ?? p.images?.[0];
  const offer = p.offers?.find((o) => o.price?.currency === "USD" && typeof o.price.price === "number") ?? p.offers?.[0];
  const attributes: Record<string, string> = {};
  const brand = p.brands?.[0]?.name;
  if (brand) attributes.brand = brand;
  for (const [k, v] of Object.entries(p.structured_attributes ?? {}).slice(0, 5)) if (v?.length) attributes[k.replace(/-/g, " ")] = v.slice(0, 2).join(", ");
  (p.key_features ?? []).slice(0, 3).forEach((f, i) => (attributes[`feature ${i + 1}`] = f.slice(0, 160)));
  return {
    title: p.title.slice(0, 200),
    image_url: img?.url,
    price_cents: offer?.price?.price !== undefined && offer.price.currency === "USD" ? Math.round(offer.price.price * 100) : undefined,
    retailer: offer?.domain,
    attributes,
  };
}

/** Top product match for a free-text query, or null. Never throws: enrichment must not block posting. */
export async function findProduct(query: string, apiKey = process.env.CHANNEL3_API_KEY): Promise<BountyProduct | null> {
  if (!apiKey || !query.trim()) return null;
  try {
    const res = await fetchImpl("https://api.trychannel3.com/v1/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ query: query.slice(0, 200), limit: 1 }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { products?: C3Product[] };
    const top = body.products?.[0];
    return top?.title ? toBountyProduct(top) : null;
  } catch {
    return null;
  }
}
