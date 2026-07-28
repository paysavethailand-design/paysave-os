import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChartShell, EmptyState, ErrorState, KpiCard, Skeleton, Status } from "../src/index";

describe("Frontend Sprint #1 UI components", () => {
  it("renders KPI and semantic status accessibly", () => {
    const kpi = renderToStaticMarkup(
      <KpiCard label="ยอดรับชำระ" value="฿3.33M" trend="+12.4%" trendDirection="up" />,
    );
    const status = renderToStaticMarkup(<Status label="พร้อมใช้งาน" tone="success" />);
    expect(kpi).toContain("ยอดรับชำระ");
    expect(kpi).toContain("฿3.33M");
    expect(status).toContain('role="status"');
  });

  it("renders chart, loading, empty and error states", () => {
    expect(renderToStaticMarkup(<ChartShell title="แนวโน้ม">กราฟ</ChartShell>)).toContain(
      "แนวโน้ม",
    );
    expect(renderToStaticMarkup(<Skeleton aria-label="กำลังโหลด" />)).toContain("animate-pulse");
    expect(renderToStaticMarkup(<EmptyState title="ไม่พบข้อมูล" />)).toContain("ไม่พบข้อมูล");
    expect(renderToStaticMarkup(<ErrorState title="เกิดข้อผิดพลาด" />)).toContain('role="alert"');
  });
});
