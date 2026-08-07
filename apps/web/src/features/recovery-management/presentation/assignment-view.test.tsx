import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecoveryApiError } from "../application/recovery-api-error";

const { useAgents, useAssignCase, useCases } = vi.hoisted(() => ({
  useAgents: vi.fn(),
  useAssignCase: vi.fn(),
  useCases: vi.fn(),
}));

vi.mock("./use-recovery", () => ({ useAgents, useAssignCase, useCases }));

import { AssignmentView } from "./assignment-view";

const caseSummary = {
  source: "staging" as const,
  id: "RC-2026-0015",
  customerName: "ลูกค้าทดสอบ",
  phoneMasked: "***",
  stage: "new" as const,
  priority: "medium" as const,
  assignedAgentId: null,
  assignedAgentName: "ยังไม่ได้มอบหมาย",
  daysPastDue: 0,
  outstanding: 0,
  nextAction: "วันนี้",
  branch: "TEST",
  updatedAt: "วันนี้",
};

function query(overrides: Record<string, unknown> = {}) {
  return {
    data: [],
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

describe("AssignmentView terminal states", () => {
  beforeEach(() => {
    useAssignCase.mockReturnValue({ isPending: false, mutate: vi.fn() });
    useCases.mockReturnValue(query());
    useAgents.mockReturnValue(query());
  });

  it("renders a loading terminal while either required query is pending", () => {
    useCases.mockReturnValue(query({ isLoading: true }));

    const html = renderToStaticMarkup(<AssignmentView />);

    expect(html).toContain("animate-pulse");
  });

  it("renders the shared safe API error with correlation ID", () => {
    useCases.mockReturnValue(
      query({
        isError: true,
        error: new RecoveryApiError(
          "dependency_failure",
          "internal_error",
          "private detail",
          500,
          "corr-assignment-1",
        ),
      }),
    );

    const html = renderToStaticMarkup(<AssignmentView />);

    expect(html).toContain("โหลด Assignment Screen ไม่สำเร็จ");
    expect(html).toContain("corr-assignment-1");
    expect(html).not.toContain("private detail");
  });

  it("renders an explicit no-agents state without creating mock employees", () => {
    useCases.mockReturnValue(query({ data: [caseSummary] }));
    useAgents.mockReturnValue(query({ data: [] }));

    const html = renderToStaticMarkup(<AssignmentView />);

    expect(html).toContain("ยังไม่มีข้อมูลพนักงาน");
    expect(html).toContain("ระบบยังไม่มีแหล่งข้อมูลพนักงานสำหรับ Assignment");
    expect(html).not.toContain("Mock Repository");
    expect(html).not.toContain("Mock API");
  });
});
