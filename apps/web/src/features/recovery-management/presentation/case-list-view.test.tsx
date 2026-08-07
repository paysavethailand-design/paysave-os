import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RecoveryApiError } from "../application/recovery-api-error";

const { useCases } = vi.hoisted(() => ({ useCases: vi.fn() }));

vi.mock("./use-recovery", () => ({ useCases }));

import { CaseListView } from "./case-list-view";

describe("CaseListView errors", () => {
  it("uses the real Recovery API error contract instead of stale mock copy", () => {
    useCases.mockReturnValue({
      data: undefined,
      error: new RecoveryApiError(
        "forbidden",
        "forbidden",
        "private detail",
        403,
        "corr-cases-403",
      ),
      isError: true,
      isLoading: false,
      refetch: vi.fn(),
    });

    const html = renderToStaticMarkup(<CaseListView />);

    expect(html).toContain("บัญชีนี้ไม่มีสิทธิ์เข้าถึงข้อมูล Recovery");
    expect(html).toContain("corr-cases-403");
    expect(html).not.toContain("Mock Repository");
    expect(html).not.toContain("private detail");
  });
});
