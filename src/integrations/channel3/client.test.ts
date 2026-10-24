import { afterEach, describe, expect, it } from "vitest";
import { findProduct, setChannel3Fetch, toBountyProduct } from "./client";

const sample = {
  id: "DO0tdjT",
  title: "Barista Express Espresso Machine",
  brands: [{ name: "Breville" }],
  images: [
    { url: "https://cdn.example/alt.jpg", is_main_image: false },
    { url: "https://cdn.example/main.jpg", is_main_image: true },
  ],
  offers: [{ domain: "macys.com", price: { price: 499.95, currency: "USD" }, availability: "InStock" }],
  key_features: ["15-bar Italian pump", "Built-in grinder"],
  structured_attributes: { "espresso-boiler-type": ["Thermoblock"], "milk-frothing-system": ["Steam wand"] },
};

afterEach(() => setChannel3Fetch((...a) => fetch(...a)));

describe("Channel3 enrichment", () => {
  it("maps a product to the bounty product card", () => {
    const p = toBountyProduct(sample);
    expect(p).toMatchObject({ title: "Barista Express Espresso Machine", image_url: "https://cdn.example/main.jpg", price_cents: 49995, retailer: "macys.com" });
    expect(p.attributes).toMatchObject({ brand: "Breville", "espresso boiler type": "Thermoblock", "feature 1": "15-bar Italian pump" });
  });

  it("returns the top match, and null on errors, timeouts or no key", async () => {
    setChannel3Fetch(async () => Response.json({ products: [sample] }));
    expect((await findProduct("espresso", "k"))?.title).toBe("Barista Express Espresso Machine");
    setChannel3Fetch(async () => new Response("nope", { status: 500 }));
    expect(await findProduct("espresso", "k")).toBeNull();
    setChannel3Fetch(async () => {
      throw new Error("network");
    });
    expect(await findProduct("espresso", "k")).toBeNull();
    expect(await findProduct("espresso", "")).toBeNull();
  });
});
