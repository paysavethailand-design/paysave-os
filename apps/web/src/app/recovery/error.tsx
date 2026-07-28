"use client";
import { ErrorState } from "@paysave/ui";
export default function RecoveryError({ reset }: { readonly reset: () => void }) {
  return (
    <ErrorState
      title="Recovery Management เกิดข้อผิดพลาด"
      description="ไม่สามารถแสดง Mock UI ได้"
      actionLabel="ลองอีกครั้ง"
      onAction={reset}
    />
  );
}
