import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RecoveryApiError } from "../application/recovery-api-error";
import { RecoveryErrorState, getRecoveryErrorDisplay } from "./recovery-error-state";

describe("RecoveryErrorState", () => {
  it("renders a safe dependency message with the preserved correlation ID", () => {
    const error = new RecoveryApiError(
      "dependency_failure",
      "internal_error",
      "Unexpected server error",
      500,
      "corr-visible-123",
    );

    const html = renderToStaticMarkup(
      <RecoveryErrorState error={error} title="โหลด Recovery Cases ไม่สำเร็จ" />,
    );

    expect(html).toContain("ระบบข้อมูล Recovery ยังไม่พร้อมใช้งาน");
    expect(html).toContain("รหัสข้อผิดพลาด: internal_error");
    expect(html).toContain("HTTP 500");
    expect(html).toContain("corr-visible-123");
    expect(html).not.toContain("Unexpected server error");
  });

  it.each([
    ["timeout", "Recovery API ใช้เวลาตอบสนองนานเกินกำหนด"],
    ["unauthorized", "เซสชันไม่พร้อมใช้งาน"],
    ["forbidden", "บัญชีนี้ไม่มีสิทธิ์เข้าถึงข้อมูล Recovery"],
    ["unknown", "ไม่สามารถโหลดข้อมูล Recovery ได้"],
  ] as const)("maps %s to a safe terminal message", (kind, expected) => {
    const display = getRecoveryErrorDisplay(
      new RecoveryApiError(kind, "safe_code", "private detail", null, null),
      "โหลดไม่สำเร็จ",
    );

    expect(display.description).toContain(expected);
    expect(display.description).not.toContain("private detail");
    expect(display.code).toBe("safe_code");
  });
});
