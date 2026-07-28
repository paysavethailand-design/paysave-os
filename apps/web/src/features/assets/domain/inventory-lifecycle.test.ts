import { describe, expect, it } from "vitest";
import {
  assertInventoryTransitionAllowed,
  INVENTORY_STATUS,
  isInventoryStatus,
} from "./inventory-lifecycle";

describe("inventory lifecycle policy", () => {
  it("accepts the required received to closed sales flow", () => {
    expect(() =>
      assertInventoryTransitionAllowed(INVENTORY_STATUS.RECEIVED, INVENTORY_STATUS.READY_FOR_SALE),
    ).not.toThrow();
    expect(() =>
      assertInventoryTransitionAllowed(INVENTORY_STATUS.READY_FOR_SALE, INVENTORY_STATUS.SOLD),
    ).not.toThrow();
    expect(() =>
      assertInventoryTransitionAllowed(INVENTORY_STATUS.SOLD, INVENTORY_STATUS.DELIVERED),
    ).not.toThrow();
    expect(() =>
      assertInventoryTransitionAllowed(INVENTORY_STATUS.DELIVERED, INVENTORY_STATUS.CLOSED),
    ).not.toThrow();
  });

  it("supports inspection and reversible reservation", () => {
    expect(() =>
      assertInventoryTransitionAllowed(INVENTORY_STATUS.RECEIVED, INVENTORY_STATUS.INSPECTION),
    ).not.toThrow();
    expect(() =>
      assertInventoryTransitionAllowed(
        INVENTORY_STATUS.INSPECTION,
        INVENTORY_STATUS.READY_FOR_SALE,
      ),
    ).not.toThrow();
    expect(() =>
      assertInventoryTransitionAllowed(INVENTORY_STATUS.READY_FOR_SALE, INVENTORY_STATUS.RESERVED),
    ).not.toThrow();
    expect(() =>
      assertInventoryTransitionAllowed(INVENTORY_STATUS.RESERVED, INVENTORY_STATUS.READY_FOR_SALE),
    ).not.toThrow();
  });

  it("rejects invalid lifecycle skips", () => {
    expect(() =>
      assertInventoryTransitionAllowed(INVENTORY_STATUS.RECEIVED, INVENTORY_STATUS.CLOSED),
    ).toThrowError(/Invalid inventory lifecycle transition/);
    expect(() =>
      assertInventoryTransitionAllowed(INVENTORY_STATUS.SOLD, INVENTORY_STATUS.READY_FOR_SALE),
    ).toThrowError(/Invalid inventory lifecycle transition/);
  });

  it("keeps legacy non-inventory transitions compatible", () => {
    expect(isInventoryStatus("active")).toBe(false);
    expect(() => assertInventoryTransitionAllowed("active", "repossessed")).not.toThrow();
  });
});
