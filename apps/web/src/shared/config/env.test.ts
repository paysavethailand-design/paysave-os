import { describe, expect, it } from "vitest";
import { parsePublicEnvironment, parseServerEnvironment } from "./env";

describe("parsePublicEnvironment", () => {
  it("accepts a valid Supabase project configuration", () => {
    expect(
      parsePublicEnvironment({
        NEXT_PUBLIC_APP_URL: "https://app.paysave.co.th",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      }),
    ).toEqual({
      appUrl: "https://app.paysave.co.th",
      supabaseUrl: "https://example.supabase.co",
      supabasePublishableKey: "sb_publishable_example",
    });
  });

  it("rejects missing or unsafe configuration", () => {
    expect(() => parsePublicEnvironment({})).toThrow();
    expect(() =>
      parsePublicEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "short",
      }),
    ).toThrow();
  });
});

describe("parseServerEnvironment", () => {
  it("parses the design preview flag explicitly", () => {
    expect(parseServerEnvironment({ PAYSAVE_ENABLE_DESIGN_PREVIEW: "true" })).toEqual({
      enableDesignPreview: true,
    });
    expect(parseServerEnvironment({ PAYSAVE_ENABLE_DESIGN_PREVIEW: "false" })).toEqual({
      enableDesignPreview: false,
    });
  });

  it("defaults the design preview flag to disabled and rejects invalid values", () => {
    expect(parseServerEnvironment({})).toEqual({ enableDesignPreview: false });
    expect(() => parseServerEnvironment({ PAYSAVE_ENABLE_DESIGN_PREVIEW: "yes" })).toThrow();
  });
});
