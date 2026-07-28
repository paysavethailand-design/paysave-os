export const INVENTORY_DASHBOARD_COPY = {
  totalStock: "Total Stock",
  readyForSale: "Ready for Sale",
  reserved: "Reserved",
  soldToday: "Sold Today",
  deadStock: "Dead Stock",
  aging: "Aging",
  dailySales: "Daily Sales",
  monthlySales: "Monthly Sales",
  byBrand: "Sales by Brand",
  byBuyer: "Sales by Buyer",
  byEmployee: "Sales by Employee",
} as const;

export const requiredInventoryDashboardLabels = Object.values(INVENTORY_DASHBOARD_COPY);
