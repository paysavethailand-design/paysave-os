export const INVENTORY_STATUS = {
  RECEIVED: "received",
  INSPECTION: "inspection",
  READY_FOR_SALE: "ready_for_sale",
  RESERVED: "reserved",
  SOLD: "sold",
  DELIVERED: "delivered",
  CLOSED: "closed",
} as const;

export type InventoryStatus = (typeof INVENTORY_STATUS)[keyof typeof INVENTORY_STATUS];

export const inventoryStatuses = Object.values(INVENTORY_STATUS) as readonly InventoryStatus[];

const allowedTransitions: Readonly<Record<InventoryStatus, readonly InventoryStatus[]>> = {
  received: [INVENTORY_STATUS.INSPECTION, INVENTORY_STATUS.READY_FOR_SALE],
  inspection: [INVENTORY_STATUS.READY_FOR_SALE],
  ready_for_sale: [INVENTORY_STATUS.RESERVED, INVENTORY_STATUS.SOLD],
  reserved: [INVENTORY_STATUS.READY_FOR_SALE, INVENTORY_STATUS.SOLD],
  sold: [INVENTORY_STATUS.DELIVERED],
  delivered: [INVENTORY_STATUS.CLOSED],
  closed: [],
};

export function isInventoryStatus(value: string): value is InventoryStatus {
  return inventoryStatuses.includes(value as InventoryStatus);
}

/**
 * Enforces the governed stock lifecycle without breaking legacy asset status workflows. Validation
 * becomes strict when either side is an inventory status; unrelated legacy transitions pass through.
 */
export function assertInventoryTransitionAllowed(fromStatus: string, toStatus: string): void {
  if (!isInventoryStatus(fromStatus) && !isInventoryStatus(toStatus)) return;

  if (
    !isInventoryStatus(fromStatus) ||
    !isInventoryStatus(toStatus) ||
    !allowedTransitions[fromStatus].includes(toStatus)
  ) {
    throw new Error(`Invalid inventory lifecycle transition: ${fromStatus} -> ${toStatus}`);
  }
}
