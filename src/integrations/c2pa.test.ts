import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { credentialDoubts } from "@/domain/verify/verify";
import { readContentCredentials } from "./c2pa";

describe("Content Credentials", () => {
  it("reads a signed photo (C2PA sample from c2pa-rs)", async () => {
    const c = await readContentCredentials(readFileSync(path.resolve("tests/fixtures/c2pa-signed.jpg")));
    expect(c).toMatchObject({ issuer: "C2PA Test Signing Cert", aiGenerated: false });
    expect(c?.validation).toMatch(/valid|trusted/i);
  });

  it("returns null for a photo without credentials, and for junk", async () => {
    expect(await readContentCredentials(readFileSync(path.resolve("e2e/photos/good-1.jpg")))).toBeNull();
    expect(await readContentCredentials(Buffer.from("not an image"))).toBeNull();
  });

  it("only adds doubt: AI-made or broken signatures", () => {
    const base = { issuer: "X", generator: null, signedAt: null, validation: "Valid", aiGenerated: false };
    expect(credentialDoubts([null, base])).toEqual([]);
    expect(credentialDoubts([{ ...base, aiGenerated: true }])[0]).toMatch(/made with AI/);
    expect(credentialDoubts([null, { ...base, validation: "Invalid" }])[0]).toMatch(/Photo 2's Content Credentials don't check out/);
  });

  it("a photo picked as a file needs a valid camera signature; in-app camera photos don't", () => {
    const base = { issuer: "Camera Co", generator: null, signedAt: null, validation: "Valid", aiGenerated: false };
    expect(credentialDoubts([null], ["camera"])).toEqual([]);
    expect(credentialDoubts([null], ["file"])[0]).toMatch(/chosen from the phone/);
    expect(credentialDoubts([base], ["file"])).toEqual([]);
    expect(credentialDoubts([{ ...base, aiGenerated: true }], ["file"])[0]).toMatch(/made with AI/);
  });
});
