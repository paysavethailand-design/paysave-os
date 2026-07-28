import { describe, expect, it } from "vitest";
import { ApiError } from "./api-error";
import { parseBoundedPageRequest, toBoundedPage } from "./pagination";

describe("parseBoundedPageRequest", () => {
  it("defaults to a limit of 20 with no cursor", () => {
    expect(parseBoundedPageRequest(new URLSearchParams())).toEqual({ limit: 20, cursor: null });
  });

  it("accepts an explicit limit and cursor", () => {
    expect(parseBoundedPageRequest(new URLSearchParams("limit=5&cursor=abc"))).toEqual({
      limit: 5,
      cursor: "abc",
    });
  });

  it("rejects a limit above the bound instead of clamping it", () => {
    expect(() => parseBoundedPageRequest(new URLSearchParams("limit=101"))).toThrow(ApiError);
  });

  it("rejects a non-positive or non-integer limit", () => {
    expect(() => parseBoundedPageRequest(new URLSearchParams("limit=0"))).toThrow(ApiError);
    expect(() => parseBoundedPageRequest(new URLSearchParams("limit=2.5"))).toThrow(ApiError);
    expect(() => parseBoundedPageRequest(new URLSearchParams("limit=abc"))).toThrow(ApiError);
  });

  it("treats an empty cursor as absent", () => {
    expect(parseBoundedPageRequest(new URLSearchParams("cursor="))).toEqual({
      limit: 20,
      cursor: null,
    });
  });
});

describe("toBoundedPage", () => {
  const rows = [{ id: "1" }, { id: "2" }, { id: "3" }];

  it("reports no next cursor when rows fit within the limit", () => {
    expect(toBoundedPage(rows, 3)).toEqual({ items: rows, nextCursor: null });
  });

  it("trims the lookahead row and returns its id as the next cursor", () => {
    expect(toBoundedPage(rows, 2)).toEqual({
      items: [{ id: "1" }, { id: "2" }],
      nextCursor: "2",
    });
  });
});
