import { describe, expect, it } from "vitest";
import type {
  BusinessPlatformRepository,
  BusinessPlatformSnapshot,
} from "../ports/business-platform-repository";
import { getBusinessPlatformOverview } from "./get-business-platform-overview";

const moduleCatalog = [
  ["foundation", "5.4A"],
  ["partner-management", "5.4B"],
  ["case-management", "5.4C"],
  ["assignment-engine", "5.4D"],
  ["workflow-engine", "5.4E"],
  ["field-operations", "5.4F"],
  ["commission-finance", "5.4G"],
  ["executive-dashboard", "5.4G"],
  ["business-analytics", "5.4G"],
  ["reports", "5.4G"],
  ["notifications", "5.4G"],
] as const;

const validSnapshot: BusinessPlatformSnapshot = {
  publishedAt: "2026-07-28T00:00:00.000Z",
  modules: moduleCatalog.map(([id, stage]) => ({
    id,
    stage,
    title: id,
    description: `${id} module`,
    status: "READY",
  })),
};

function repository(snapshot: BusinessPlatformSnapshot): BusinessPlatformRepository {
  return { loadSnapshot: async () => snapshot };
}

describe("getBusinessPlatformOverview", () => {
  it("projects the complete immutable Business Platform snapshot", async () => {
    const model = await getBusinessPlatformOverview(repository(validSnapshot));
    expect(model.status).toBe("BUSINESS PLATFORM READY");
    expect(model.publishedAt).toBe(validSnapshot.publishedAt);
    expect(model.modules).toHaveLength(11);
    expect(model.modules.every((item) => item.status === "READY")).toBe(true);
    expect(Object.isFrozen(model)).toBe(true);
  });

  it("fails closed when the repository returns duplicate module identifiers", async () => {
    const model = await getBusinessPlatformOverview(
      repository({
        ...validSnapshot,
        modules: [validSnapshot.modules[0]!, validSnapshot.modules[0]!],
      }),
    );
    expect(model.status).toBe("UNKNOWN");
    expect(model.modules).toEqual([]);
    expect(model.message).toContain("validation");
  });

  it("fails closed when the repository is unavailable", async () => {
    const model = await getBusinessPlatformOverview({
      loadSnapshot: async () => {
        throw new Error("unavailable");
      },
    });
    expect(model.status).toBe("UNKNOWN");
    expect(model.publishedAt).toBeNull();
    expect(model.modules).toEqual([]);
  });
});
