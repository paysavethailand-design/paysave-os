export interface BreadcrumbItem {
  readonly label: string;
  readonly href: string | null;
}

const routeLabels: Readonly<Record<string, string>> = {
  business: "Business Platform",
  cases: "เคส",
  assignments: "งานมอบหมาย",
  customers: "ลูกค้า",
  reports: "รายงาน",
  payments: "การชำระเงิน",
  commission: "คอมมิชชั่น",
  admin: "จัดการระบบ",
  users: "ผู้ใช้งาน",
  profile: "โปรไฟล์",
};

const businessModuleLabels: Readonly<Record<string, string>> = {
  partners: "Partner Management",
  cases: "Case Management",
  assignments: "Assignment Management",
  workflows: "Workflow Management",
  "field-operations": "Field Operations",
  finance: "Commission & Finance",
  dashboard: "Executive Dashboard",
  analytics: "Business Analytics",
  reports: "Reports",
  notifications: "Notifications",
};

/** Converts a URL pathname into readable Thai breadcrumb items. */
export function buildBreadcrumbs(pathname: string): readonly BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return [{ label: "หน้าหลัก", href: null }];
  }

  const items: BreadcrumbItem[] = [{ label: "หน้าหลัก", href: "/" }];
  segments.forEach((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const businessModuleLabel =
      segments[0] === "business" && index === 1 ? businessModuleLabels[segment] : undefined;
    items.push({
      label: businessModuleLabel ?? routeLabels[segment] ?? decodeURIComponent(segment),
      href: index === segments.length - 1 ? null : href,
    });
  });
  return items;
}
