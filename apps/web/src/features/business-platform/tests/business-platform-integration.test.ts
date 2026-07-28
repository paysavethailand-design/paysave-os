import { describe, expect, it } from "vitest";
import { getBusinessPlatformOverview } from "../application/queries/get-business-platform-overview";
import { FoundationBusinessPlatformRepository } from "../infrastructure/foundation-business-platform-repository";

/** Exercises the complete Stage 5.4 catalog path below the server composition root. */
describe("Business Platform integration", () => {
  it("flows immutable trusted-adapter data through the Application query", async () => {
    const model = await getBusinessPlatformOverview(new FoundationBusinessPlatformRepository());
    expect(model.status).toBe("BUSINESS PLATFORM READY");
    expect(model.modules).toHaveLength(11);
    expect(model.modules.every((item) => item.status === "READY")).toBe(true);
  });
});
