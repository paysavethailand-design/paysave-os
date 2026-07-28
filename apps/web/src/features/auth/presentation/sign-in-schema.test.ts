import { describe, expect, it } from "vitest";
import { getSafeRedirectPath, signInSchema } from "./sign-in-schema";

describe("signInSchema", () => {
  it("normalizes a valid email", () => {
    expect(signInSchema.parse({ email: "  USER@PAYSAVE.CO.TH ", password: "password123" })).toEqual(
      { email: "user@paysave.co.th", password: "password123" },
    );
  });

  it("rejects invalid credentials before calling Supabase", () => {
    expect(signInSchema.safeParse({ email: "invalid", password: "123" }).success).toBe(false);
  });
});

describe("getSafeRedirectPath", () => {
  it("accepts only local absolute paths", () => {
    expect(getSafeRedirectPath("/agent/tasks")).toBe("/agent/tasks");
    expect(getSafeRedirectPath("https://attacker.example")).toBe("/");
    expect(getSafeRedirectPath("//attacker.example")).toBe("/");
  });
});
