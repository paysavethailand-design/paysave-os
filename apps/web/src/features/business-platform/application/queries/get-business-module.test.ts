import { describe, expect, it } from "vitest";
import type {
  BusinessModuleRepository,
  BusinessModuleSnapshot,
} from "../ports/business-module-repository";
import { getBusinessModule } from "./get-business-module";

const validSnapshot: BusinessModuleSnapshot = {
  moduleId: "partner-management",
  publishedAt: "2026-07-28T00:00:00.000Z",
  source: "tenant.partners",
  title: "Partner Management",
  description: "Live tenant-scoped partner directory.",
  metrics: [{ label: "Partners", value: 2, detail: "Visible partners", tone: "info" }],
  records: [
    {
      id: "partner-1",
      title: "Partner A",
      status: "active",
      detail: "Code A",
      occurredAt: "2026-07-28T00:00:00.000Z",
    },
  ],
};

function repository(snapshot = validSnapshot): BusinessModuleRepository {
  return { loadModule: async () => snapshot };
}

describe("getBusinessModule", () => {
  it("returns a validated immutable read model", async () => {
    const model = await getBusinessModule("partner-management", repository());
    expect(model.status).toBe("READY");
    expect(model.source).toBe("tenant.partners");
    expect(model.metrics[0]?.value).toBe(2);
    expect(Object.isFrozen(model)).toBe(true);
    expect(Object.isFrozen(model.records)).toBe(true);
  });

  it("fails closed when the repository throws", async () => {
    const model = await getBusinessModule("case-management", {
      loadModule: async () => {
        throw new Error("provider unavailable");
      },
    });
    expect(model.status).toBe("UNKNOWN");
    expect(model.records).toEqual([]);
    expect(model.metrics).toEqual([]);
  });

  it("fails closed when the snapshot is invalid", async () => {
    const model = await getBusinessModule(
      "partner-management",
      repository({ ...validSnapshot, publishedAt: "not-a-date" }),
    );
    expect(model.status).toBe("UNKNOWN");
    expect(model.message).toMatch(/validation/i);
  });

  it("rejects a snapshot for a different module", async () => {
    const model = await getBusinessModule("case-management", repository());
    expect(model.status).toBe("UNKNOWN");
  });
});
