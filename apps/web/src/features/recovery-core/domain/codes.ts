export const RECOVERY_PERMISSIONS = {
  CASES_READ: "cases.read",
  CASES_MANAGE: "cases.manage",
  ASSIGNMENTS_READ: "assignments.read",
  ASSIGNMENTS_MANAGE: "assignments.manage",
} as const;
export const ATOMIC_TRANSACTION_ERROR_CODE = "atomic_transaction_not_supported" as const;
export const ATOMIC_TRANSACTION_REASON =
  "Atomic multi-aggregate transaction is not yet supported by the current approved architecture.";
export const ATOMIC_GAP_ACTIONS = [
  "case.close",
  "case.reopen",
  "assignment.reassign",
  "assignment.accept",
  "assignment.reject",
  "assignment.complete",
  "workflow.transition",
  "promise.fulfill",
  "promise.broken",
  "promise.cancel",
] as const;
export type AtomicGapAction = (typeof ATOMIC_GAP_ACTIONS)[number];
