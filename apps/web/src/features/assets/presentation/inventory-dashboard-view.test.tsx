import { describe, expect, it } from "vitest";
import { requiredInventoryDashboardLabels } from "./inventory-dashboard-copy";

describe("inventory dashboard copy contract", () => {
  it("contains every required inventory and sales metric", () => {
    expect(requiredInventoryDashboardLabels).toEqual([
      "Total Stock",
      "Ready for Sale",
      "Reserved",
      "Sold Today",
      "Dead Stock",
      "Aging",
      "Daily Sales",
      "Monthly Sales",
      "Sales by Brand",
      "Sales by Buyer",
      "Sales by Employee",
    ]);
  });
});
