"use client";

import { ErrorState } from "@paysave/ui";
import { RecoveryApiError } from "../application/recovery-api-error";

export interface RecoveryErrorDisplay {
  readonly title: string;
  readonly description: string;
  readonly code: string;
  readonly status: number | null;
  readonly correlationId: string | null;
}

export function getRecoveryErrorDisplay(error: unknown, title: string): RecoveryErrorDisplay {
  if (!(error instanceof RecoveryApiError)) {
    return {
      title,
      description: "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่",
      code: "unknown_error",
      status: null,
      correlationId: null,
    };
  }

  const description = (() => {
    switch (error.kind) {
      case "timeout":
        return "Recovery API ใช้เวลาตอบสนองนานเกินกำหนด กรุณาลองใหม่";
      case "unauthorized":
        return "เซสชันไม่พร้อมใช้งาน กรุณาเข้าสู่ระบบใหม่";
      case "forbidden":
        return "บัญชีนี้ไม่มีสิทธิ์เข้าถึงข้อมูล Recovery";
      case "dependency_failure":
        return "ระบบข้อมูล Recovery ยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง";
      default:
        return "ไม่สามารถโหลดข้อมูล Recovery ได้ กรุณาลองใหม่";
    }
  })();

  return {
    title,
    description,
    code: error.code,
    status: error.status,
    correlationId: error.correlationId,
  };
}

export function RecoveryErrorState({
  error,
  onRetry,
  title,
}: {
  readonly error: unknown;
  readonly onRetry?: () => void;
  readonly title: string;
}) {
  const display = getRecoveryErrorDisplay(error, title);
  const evidence = [
    `รหัสข้อผิดพลาด: ${display.code}`,
    display.status === null ? null : `HTTP ${display.status}`,
    display.correlationId ? `รหัสอ้างอิง: ${display.correlationId}` : null,
  ]
    .filter((item): item is string => item !== null)
    .join(" · ");
  const description = `${display.description} ${evidence}`;

  return onRetry ? (
    <ErrorState
      actionLabel="ลองอีกครั้ง"
      description={description}
      onAction={onRetry}
      title={display.title}
    />
  ) : (
    <ErrorState description={description} title={display.title} />
  );
}
