import type { AuthContext } from "@paysave/security";
import { AppShell, DashboardPreview } from "@/features/app-shell";

const previewContext: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: "1001",
  roles: ["super_admin"],
  permissions: [
    "cases.read",
    "assignments.read",
    "customers.read",
    "reports.read",
    "payments.read",
    "commission.read",
    "users.manage",
  ],
  tenantScope: "all",
  sessionVersion: 1,
};

const previewNotifications = [
  { id: "1", title: "มีเคสใหม่ 24 รายการ", detail: "รอตรวจสอบและมอบหมายเจ้าหน้าที่", unread: true },
  {
    id: "2",
    title: "KPI ทีมภาคสนามเพิ่มขึ้น",
    detail: "ผลการดำเนินงานสูงกว่าเป้าหมาย 8.4%",
    unread: true,
  },
  { id: "3", title: "รายงานพร้อมดาวน์โหลด", detail: "รายงานประจำวันสร้างเสร็จแล้ว", unread: false },
] as const;

/** Renders the environment-gated, database-free layout preview. */
export default function LayoutPreviewPage() {
  return (
    <AppShell
      context={previewContext}
      notifications={previewNotifications}
      profile={{
        name: "ณภัทร PAYSAVE",
        email: "admin@paysave.co.th",
        initials: "NP",
        roleLabel: "Super Admin",
      }}
    >
      <DashboardPreview />
    </AppShell>
  );
}
