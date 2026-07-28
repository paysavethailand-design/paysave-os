"use client";
import { Button, ErrorState } from "@paysave/ui";
import { DashboardShell } from "./dashboard-shell";
export function DashboardError({ reset }: { readonly reset: () => void }) {
  return (
    <DashboardShell>
      <ErrorState
        actionLabel="ลองใหม่"
        description="ไม่สามารถแสดง Mock Dashboard ได้ กรุณาลองโหลดข้อมูลจำลองใหม่"
        onAction={reset}
        title="เกิดข้อผิดพลาดในการแสดงผล"
      />
      <div className="sr-only">
        <Button onClick={reset}>ลองใหม่</Button>
      </div>
    </DashboardShell>
  );
}
