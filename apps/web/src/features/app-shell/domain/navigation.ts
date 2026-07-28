import { hasPermission, type AuthContext, type PermissionCode } from "@paysave/security";

export type NavigationIconKey =
  | "dashboard"
  | "business"
  | "cases"
  | "assignments"
  | "customers"
  | "reports"
  | "payments"
  | "commission"
  | "admin";

export interface NavigationItem {
  readonly key: NavigationIconKey;
  readonly label: string;
  readonly href: string;
  readonly permission: PermissionCode | null;
}

const navigationItems: readonly NavigationItem[] = [
  { key: "dashboard", label: "ภาพรวม", href: "/", permission: null },
  {
    key: "business",
    label: "Business Platform",
    href: "/business",
    permission: null,
  },
  { key: "cases", label: "เคสติดตาม", href: "/cases", permission: "cases.read" },
  { key: "assignments", label: "งานมอบหมาย", href: "/assignments", permission: "assignments.read" },
  { key: "customers", label: "ลูกค้า", href: "/customers", permission: "customers.read" },
  {
    key: "reports",
    label: "รายงาน",
    href: "/business/reports",
    permission: "reports.read",
  },
  { key: "payments", label: "การชำระเงิน", href: "/payments", permission: "payments.read" },
  { key: "commission", label: "คอมมิชชั่น", href: "/commission", permission: "commission.read" },
  { key: "admin", label: "จัดการระบบ", href: "/admin", permission: "users.manage" },
];

/** Returns navigation entries explicitly allowed by verified JWT permissions. */
export function getVisibleNavigation(context: AuthContext): readonly NavigationItem[] {
  return navigationItems.filter(
    (item) => item.permission === null || hasPermission(context, item.permission),
  );
}
