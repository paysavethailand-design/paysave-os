import { describe, expect, it } from "vitest";
import { mockLoginSchema } from "./mock-login-schema";

describe("mockLoginSchema", () => {
  it("accepts the documented mock credentials", () => {
    expect(
      mockLoginSchema.safeParse({ email: "demo@paysave.local", password: "MockOnly123!" }).success,
    ).toBe(true);
  });

  it("rejects invalid email and short password", () => {
    const result = mockLoginSchema.safeParse({ email: "invalid", password: "short" });
    expect(result.success).toBe(false);
  });
});
